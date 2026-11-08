// File: services/billing/payment_processor.js
// Runtime: Node.js 20.x | Memory: 512MB | Timeout: 15s

const crypto = require("crypto");
const { Pool } = require("pg");

const dbPool = new Pool({
    connectionString: process.env.DATABASE_CONNECTION_STRING || process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30000
});

const MAX_OTP_ATTEMPTS = 5;
const OTP_TTL_MINUTES = 10;

function verifyHmacSignature(rawBody, signatureHeader, secretKey) {
    if (!signatureHeader || !secretKey || typeof rawBody !== "string") return false;
    const expectedHex = crypto
        .createHmac("sha256", secretKey)
        .update(rawBody, "utf8")
        .digest("hex");

    const sigBuf = Buffer.from(signatureHeader, "utf8");
    const expBuf = Buffer.from(expectedHex, "utf8");
    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
}

exports.handler = async (event) => {
    const route = event.rawPath || event.path || "";
    const rawBody = event.body || "{}";
    let body;

    try {
        body = JSON.parse(rawBody);
    } catch {
        return { statusCode: 400, body: JSON.stringify({ error: "INVALID_JSON_PAYLOAD" }) };
    }

    const dbClient = await dbPool.connect();
    let inTransaction = false;

    const beginTx = async (tenantId = null) => {
        await dbClient.query("BEGIN");
        inTransaction = true;
        if (tenantId) {
            await dbClient.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenantId]);
        }
    };

    const commitTx = async () => {
        if (inTransaction) {
            await dbClient.query("COMMIT");
            inTransaction = false;
        }
    };

    const rollbackTx = async () => {
        if (inTransaction) {
            await dbClient.query("ROLLBACK");
            inTransaction = false;
        }
    };

    try {
        // =================================================================
        // ROUTE 1: HESABPAY IPN WEBHOOK CALLBACK
        // =================================================================
        if (route.endsWith("/webhooks/hesabpay")) {
            const signature =
                event.headers?.["x-hesabpay-signature"] ||
                event.headers?.["X-HesabPay-Signature"];

            if (!verifyHmacSignature(rawBody, signature, process.env.HESABPAY_SECRET_KEY)) {
                return { statusCode: 401, body: JSON.stringify({ error: "INVALID_SIGNATURE" }) };
            }

            const { transaction_id, status, tenant_id, amount_afn } = body;
            if (!transaction_id || !tenant_id || !amount_afn) {
                return { statusCode: 400, body: JSON.stringify({ error: "MISSING_REQUIRED_FIELDS" }) };
            }

            await beginTx(tenant_id);

            let shouldNotify = false;
            if (status === "COMPLETED") {
                const insertRes = await dbClient.query(
                    `INSERT INTO payment_transactions
                     (tenant_id, amount_afn, payment_channel, transaction_reference, is_verified, verified_at)
                     VALUES ($1, $2, 'hesabpay', $3, true, NOW())
                     ON CONFLICT (transaction_reference) DO NOTHING
                     RETURNING id`,
                    [tenant_id, amount_afn, transaction_id]
                );

                if (insertRes.rowCount > 0) {
                    await dbClient.query(
                        `UPDATE tenants
                         SET account_status = 'active',
                             subscription_end_date = GREATEST(subscription_end_date, NOW()) + INTERVAL '365 days',
                             updated_at = NOW()
                         WHERE id = $1`,
                        [tenant_id]
                    );
                    shouldNotify = true;
                }
            }

            const tenantInfo = shouldNotify ? await getTenantContact(dbClient, tenant_id) : null;
            await commitTx();

            if (tenantInfo) {
                await sendWhatsAppTemplate(
                    tenantInfo.owner_phone,
                    "aria_payment_receipt",
                    tenantInfo.preferred_locale,
                    [String(amount_afn), "HesabPay", transaction_id]
                );
            }

            return { statusCode: 200, body: JSON.stringify({ status: "ACK" }) };
        }

        // =================================================================
        // ROUTE 2: FIELD CASH STEP 1 - AGENT INITIATION (DISPATCH OTP)
        // =================================================================
        if (route.endsWith("/cash/initiate")) {
            const { agent_id, tenant_id, amount_afn } = body;
            const parsedAmount = Number(amount_afn);

            if (!agent_id || !tenant_id || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
                return { statusCode: 400, body: JSON.stringify({ error: "INVALID_PARAMETERS" }) };
            }

            await beginTx(tenant_id);

            const agentRes = await dbClient.query(
                `SELECT full_name, current_cash_held_afn, max_cash_float_afn
                 FROM billing_agents
                 WHERE id = $1 AND is_authorized = true
                 FOR UPDATE`,
                [agent_id]
            );
            if (agentRes.rows.length === 0) {
                await rollbackTx();
                return { statusCode: 403, body: JSON.stringify({ error: "UNAUTHORIZED_AGENT" }) };
            }

            const pendingRes = await dbClient.query(
                `SELECT COALESCE(SUM(amount_afn), 0) AS pending_cash_afn
                 FROM payment_transactions
                 WHERE agent_id = $1
                   AND payment_channel = 'field_cash'
                   AND is_verified = false
                   AND otp_expires_at > NOW()`,
                [agent_id]
            );

            const agent = agentRes.rows[0];
            const committedFloat =
                parseFloat(agent.current_cash_held_afn) +
                parseFloat(pendingRes.rows[0].pending_cash_afn);

            if (committedFloat + parsedAmount > parseFloat(agent.max_cash_float_afn)) {
                await rollbackTx();
                return { statusCode: 400, body: JSON.stringify({ error: "AGENT_FLOAT_LIMIT_EXCEEDED" }) };
            }

            const tenantInfo = await getTenantContact(dbClient, tenant_id);
            if (!tenantInfo) {
                await rollbackTx();
                return { statusCode: 404, body: JSON.stringify({ error: "TENANT_NOT_FOUND" }) };
            }

            const otp = crypto.randomInt(100000, 1000000).toString();

            const txRes = await dbClient.query(
                `INSERT INTO payment_transactions
                 (tenant_id, amount_afn, payment_channel, agent_id, verification_otp, otp_expires_at, otp_attempt_count, is_verified)
                 VALUES ($1, $2, 'field_cash', $3, $4, NOW() + ($5 || ' minutes')::interval, 0, false)
                 RETURNING id`,
                [tenant_id, parsedAmount, agent_id, otp, String(OTP_TTL_MINUTES)]
            );

            await commitTx();

            await sendWhatsAppTemplate(
                tenantInfo.owner_phone,
                "aria_cash_otp_verify",
                tenantInfo.preferred_locale,
                [agent.full_name, String(parsedAmount), otp]
            );

            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: "OTP_DISPATCHED",
                    transaction_id: txRes.rows[0].id,
                    expires_in_seconds: OTP_TTL_MINUTES * 60
                })
            };
        }

        // =================================================================
        // ROUTE 3: FIELD CASH STEP 2 - AGENT OTP VERIFICATION (FINALIZE)
        // =================================================================
        if (route.endsWith("/cash/verify")) {
            const { tenant_id, transaction_id, entered_otp } = body;
            if (!tenant_id || !transaction_id || typeof entered_otp !== "string") {
                return { statusCode: 400, body: JSON.stringify({ error: "MISSING_REQUIRED_FIELDS" }) };
            }

            await beginTx(tenant_id);

            const txRes = await dbClient.query(
                `SELECT id, tenant_id, agent_id, amount_afn, verification_otp,
                        otp_expires_at, otp_attempt_count, is_verified
                 FROM payment_transactions
                 WHERE id = $1 AND tenant_id = $2
                 FOR UPDATE`,
                [transaction_id, tenant_id]
            );

            if (txRes.rows.length === 0) {
                await rollbackTx();
                return { statusCode: 404, body: JSON.stringify({ error: "TX_NOT_FOUND" }) };
            }
            const tx = txRes.rows[0];

            if (tx.is_verified) {
                await rollbackTx();
                return { statusCode: 400, body: JSON.stringify({ error: "ALREADY_VERIFIED" }) };
            }

            if (tx.otp_attempt_count >= MAX_OTP_ATTEMPTS) {
                await rollbackTx();
                return { statusCode: 429, body: JSON.stringify({ error: "OTP_MAX_ATTEMPTS_EXCEEDED" }) };
            }

            if (!tx.otp_expires_at || new Date(tx.otp_expires_at) < new Date()) {
                await rollbackTx();
                return { statusCode: 400, body: JSON.stringify({ error: "OTP_EXPIRED" }) };
            }

            if (tx.verification_otp !== entered_otp.trim()) {
                await dbClient.query(
                    `UPDATE payment_transactions
                     SET otp_attempt_count = otp_attempt_count + 1
                     WHERE id = $1`,
                    [transaction_id]
                );
                await commitTx();
                return { statusCode: 400, body: JSON.stringify({ error: "INVALID_OTP" }) };
            }

            const agentRes = await dbClient.query(
                `SELECT current_cash_held_afn, max_cash_float_afn
                 FROM billing_agents
                 WHERE id = $1 AND is_authorized = true
                 FOR UPDATE`,
                [tx.agent_id]
            );
            if (
                agentRes.rows.length === 0 ||
                parseFloat(agentRes.rows[0].current_cash_held_afn) + parseFloat(tx.amount_afn) >
                    parseFloat(agentRes.rows[0].max_cash_float_afn)
            ) {
                await rollbackTx();
                return { statusCode: 400, body: JSON.stringify({ error: "AGENT_FLOAT_LIMIT_EXCEEDED" }) };
            }

            const receiptRef = `CASH-${transaction_id.slice(0, 8).toUpperCase()}`;

            await dbClient.query(
                `UPDATE payment_transactions
                 SET is_verified = true,
                     verified_at = NOW(),
                     verification_otp = NULL,
                     transaction_reference = $2
                 WHERE id = $1`,
                [transaction_id, receiptRef]
            );

            await dbClient.query(
                `UPDATE billing_agents
                 SET current_cash_held_afn = current_cash_held_afn + $1
                 WHERE id = $2`,
                [tx.amount_afn, tx.agent_id]
            );

            await dbClient.query(
                `UPDATE tenants
                 SET account_status = 'active',
                     subscription_end_date = GREATEST(subscription_end_date, NOW()) + INTERVAL '365 days',
                     updated_at = NOW()
                 WHERE id = $1`,
                [tx.tenant_id]
            );

            const tenantInfo = await getTenantContact(dbClient, tx.tenant_id);
            await commitTx();

            if (tenantInfo) {
                await sendWhatsAppTemplate(
                    tenantInfo.owner_phone,
                    "aria_payment_receipt",
                    tenantInfo.preferred_locale,
                    [String(tx.amount_afn), "Field Agent Cash", receiptRef]
                );
            }

            return {
                statusCode: 200,
                body: JSON.stringify({
                    status: "PAYMENT_CONFIRMED_SUCCESSFULLY",
                    receipt_reference: receiptRef
                })
            };
        }

        return { statusCode: 404, body: JSON.stringify({ error: "ROUTE_NOT_FOUND" }) };
    } catch (err) {
        await rollbackTx();
        console.error("Billing Handler Error:", err);
        return { statusCode: 500, body: JSON.stringify({ error: "INTERNAL_BILLING_ERROR" }) };
    } finally {
        dbClient.release();
    }
};

async function getTenantContact(client, tenantId) {
    const res = await client.query(
        "SELECT owner_phone, preferred_locale, business_name FROM tenants WHERE id = $1",
        [tenantId]
    );
    return res.rows[0] || null;
}

async function sendWhatsAppTemplate(recipientPhone, templateName, localeCode = "fa", bodyParams = []) {
    const response = await fetch(
        `https://graph.facebook.com/v20.0/${process.env.META_PHONE_ID}/messages`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: recipientPhone,
                type: "template",
                template: {
                    name: templateName,
                    language: { code: localeCode || "fa" },
                    components: [
                        {
                            type: "body",
                            parameters: bodyParams.map((text) => ({
                                type: "text",
                                text: String(text)
                            }))
                        }
                    ]
                }
            })
        }
    );

    if (!response.ok) {
        const errBody = await response.text();
        console.error(`Meta WhatsApp API Error (${response.status}):`, errBody);
    }
}

exports.verifyHmacSignature = verifyHmacSignature;
