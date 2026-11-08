/**
 * Transactional email.
 *
 * Uses Amazon SES when credentials are present; otherwise logs to stdout so a
 * local run does not need AWS. Callers must never assume delivery succeeded
 * based on this function not throwing — check `delivered`.
 */
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface SendEmailResult {
  delivered: boolean;
  reason?: string;
}

let client: SESv2Client | null = null;

function sesClient(region: string): SESv2Client {
  if (!client) client = new SESv2Client({ region });
  return client;
}

export async function sendTransactionalEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const from = process.env.SYSTEM_FROM_EMAIL || 'no-reply@ariacloudservices.org';

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    // Local / unconfigured: the link is printed so the flow is testable.
    console.info(
      `[mail:dev] to=${input.to} subject="${input.subject}"\n${input.text}`
    );
    return { delivered: false, reason: 'SES_NOT_CONFIGURED' };
  }

  try {
    await sesClient(process.env.SES_REGION || 'me-central-1').send(
      new SendEmailCommand({
        FromEmailAddress: from,
        Destination: { ToAddresses: [input.to] },
        Content: {
          Simple: {
            Subject: { Data: input.subject, Charset: 'UTF-8' },
            Body: {
              Text: { Data: input.text, Charset: 'UTF-8' },
              ...(input.html ? { Html: { Data: input.html, Charset: 'UTF-8' } } : {}),
            },
          },
        },
      })
    );
    return { delivered: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SES_SEND_FAILED';
    console.error('[mail] SES send failed:', message);
    return { delivered: false, reason: message };
  }
}
