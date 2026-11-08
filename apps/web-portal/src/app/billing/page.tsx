'use client';

import React, { useState } from 'react';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import Container from '@cloudscape-design/components/container';
import Form from '@cloudscape-design/components/form';
import FormField from '@cloudscape-design/components/form-field';
import Input from '@cloudscape-design/components/input';
import Tiles from '@cloudscape-design/components/tiles';
import Button from '@cloudscape-design/components/button';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Grid from '@cloudscape-design/components/grid';
import Table from '@cloudscape-design/components/table';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import Badge from '@cloudscape-design/components/badge';
import Box from '@cloudscape-design/components/box';
import Flashbar, { FlashbarProps } from '@cloudscape-design/components/flashbar';
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs';
import { useTranslation } from '@aria-cloud/ui';

interface LedgerTransactionRow {
  transactionId: string;
  invoiceId: string;
  method: string;
  amountAfn: number;
  amountUsd: string;
}

export default function BillingLedgerPage() {
  const { t, dir } = useTranslation();

  const [selectedPackageAfn, setSelectedPackageAfn] = useState<string>('4500');
  const [otpCode, setOtpCode] = useState<string>('849201');
  const [settlingHesabPay, setSettlingHesabPay] = useState<boolean>(false);
  const [settlingOtp, setSettlingOtp] = useState<boolean>(false);

  const [ledgerHistory, setLedgerHistory] = useState<LedgerTransactionRow[]>([
    {
      transactionId: 'tx_hesabpay_kabul01',
      invoiceId: 'INV-2026-1001',
      method: t.nav.hesabpay,
      amountAfn: 4500,
      amountUsd: '$62.50',
    },
    {
      transactionId: 'tx_handshake_herat02',
      invoiceId: 'INV-2026-1015',
      method: t.nav.cashAudit,
      amountAfn: 4500,
      amountUsd: '$62.50',
    },
  ]);

  const [flashItems, setFlashItems] = useState<
    FlashbarProps.MessageDefinition[]
  >([]);

  const handleHesabPayTopUp = async () => {
    setSettlingHesabPay(true);
    try {
      const res = await fetch('/api/billing/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'HESABPAY',
          amountAfn: Number(selectedPackageAfn),
          invoiceId: 'INV-2026-1108',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.common.error);

      setLedgerHistory((prev) => [
        {
          transactionId: data.transactionId,
          invoiceId: data.invoiceId,
          method: t.nav.hesabpay,
          amountAfn: data.amountAfn,
          amountUsd: `$${(data.amountUsdCents / 100).toFixed(2)}`,
        },
        ...prev,
      ]);

      setFlashItems([
        {
          id: data.transactionId,
          type: 'success',
          dismissible: true,
          onDismiss: () => setFlashItems([]),
          header: t.alerts.verifiedSuccessTitle,
          content: t.alerts.verifiedSuccessBody,
        },
      ]);
    } catch (err) {
      setFlashItems([
        {
          id: 'err-hp',
          type: 'error',
          dismissible: true,
          onDismiss: () => setFlashItems([]),
          header: t.common.error,
          content: err instanceof Error ? err.message : t.common.error,
        },
      ]);
    } finally {
      setSettlingHesabPay(false);
    }
  };

  const handleRedeemCashOtp = async () => {
    setSettlingOtp(true);
    try {
      const res = await fetch('/api/billing/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'CASH_VOUCHER_OTP',
          amountAfn: 4500,
          otpCode,
          invoiceId: 'INV-2026-1108',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.common.error);

      setLedgerHistory((prev) => [
        {
          transactionId: data.transactionId,
          invoiceId: data.invoiceId,
          method: t.nav.cashAudit,
          amountAfn: data.amountAfn,
          amountUsd: `$${(data.amountUsdCents / 100).toFixed(2)}`,
        },
        ...prev,
      ]);

      setFlashItems([
        {
          id: data.transactionId,
          type: 'success',
          dismissible: true,
          onDismiss: () => setFlashItems([]),
          header: t.alerts.verifiedSuccessTitle,
          content: t.alerts.verifiedSuccessBody,
        },
      ]);
    } catch (err) {
      setFlashItems([
        {
          id: 'err-otp',
          type: 'error',
          dismissible: true,
          onDismiss: () => setFlashItems([]),
          header: t.common.error,
          content: err instanceof Error ? err.message : t.common.error,
        },
      ]);
    } finally {
      setSettlingOtp(false);
    }
  };

  return (
    <div dir={dir} className="text-start start-0 end-0">
      <ContentLayout
        header={
          <SpaceBetween size="m">
            <Flashbar items={flashItems} />
            <Header
              variant="h1"
              description={t.billing.cardDesc}
              actions={<Badge color="green">{t.billing.currentPlanName}</Badge>}
            >
              {t.nav.billingHeader}
            </Header>
          </SpaceBetween>
        }
      >
        <SpaceBetween size="l">
          <Container
            header={<Header variant="h2">{t.billing.cardTitle}</Header>}
          >
            <KeyValuePairs
              columns={3}
              items={[
                {
                  label: t.billing.activePlanLabel,
                  value: (
                    <Box fontSize="heading-m" fontWeight="bold">
                      #INV-2026-1108 ({t.billing.currentPlanName})
                    </Box>
                  ),
                },
                {
                  label: t.billing.renewalCostLabel,
                  value: (
                    <Box fontSize="heading-m" fontWeight="bold">
                      {t.billing.renewalCostValue}
                    </Box>
                  ),
                },
                {
                  label: t.billing.coverageExpiryLabel,
                  value: (
                    <StatusIndicator type="success">
                      {t.infra.statusActive}
                    </StatusIndicator>
                  ),
                },
              ]}
            />
          </Container>

          <Grid
            gridDefinition={[
              { colspan: { default: 12, m: 6 } },
              { colspan: { default: 12, m: 6 } },
            ]}
          >
            <Form
              actions={
                <Button
                  variant="primary"
                  iconName="external"
                  loading={settlingHesabPay}
                  onClick={handleHesabPayTopUp}
                >
                  {t.billing.payHesabpayBtn}
                </Button>
              }
            >
              <Container header={<Header variant="h2">{t.nav.hesabpay}</Header>}>
                <SpaceBetween size="m">
                  <FormField label={t.billing.renewalCostLabel}>
                    <Tiles
                      value={selectedPackageAfn}
                      onChange={({ detail }) =>
                        setSelectedPackageAfn(detail.value)
                      }
                      items={[
                        {
                          value: '4500',
                          label: t.billing.renewalCostValue,
                          description: t.billing.currentPlanName,
                        },
                      ]}
                    />
                  </FormField>
                </SpaceBetween>
              </Container>
            </Form>

            <Form
              actions={
                <Button
                  variant="primary"
                  iconName="check"
                  loading={settlingOtp}
                  onClick={handleRedeemCashOtp}
                >
                  {t.billing.cashVerifyBtn}
                </Button>
              }
            >
              <Container
                header={<Header variant="h2">{t.nav.cashAudit}</Header>}
              >
                <SpaceBetween size="m">
                  <Box variant="p" color="text-body-secondary">
                    {t.alerts.cashPendingBody}
                  </Box>
                  <FormField
                    label={t.billing.cashOtpLabel}
                    description={t.billing.cashHint}
                  >
                    <Input
                      value={otpCode}
                      onChange={({ detail }) => setOtpCode(detail.value)}
                      placeholder={t.billing.cashOtpPlaceholder}
                      ariaLabel={t.billing.cashOtpLabel}
                      inputMode="numeric"
                    />
                  </FormField>
                </SpaceBetween>
              </Container>
            </Form>
          </Grid>

          <Table
            header={
              <Header variant="h2" counter={`(${ledgerHistory.length})`}>
                {t.nav.invoices}
              </Header>
            }
            columnDefinitions={[
              {
                id: 'invoice',
                header: t.billing.activePlanLabel,
                cell: (item) => <Box variant="code">{item.invoiceId}</Box>,
              },
              {
                id: 'method',
                header: t.infra.colComponent,
                cell: (item) => <Badge color="blue">{item.method}</Badge>,
              },
              {
                id: 'afn',
                header: t.billing.renewalCostLabel,
                cell: (item) =>
                  `${item.amountAfn.toLocaleString()} AFN (${item.amountUsd})`,
              },
              {
                id: 'status',
                header: t.infra.colStatus,
                cell: () => (
                  <StatusIndicator type="success">
                    {t.infra.statusHealthy}
                  </StatusIndicator>
                ),
              },
            ]}
            items={ledgerHistory}
          />
        </SpaceBetween>
      </ContentLayout>
    </div>
  );
}
