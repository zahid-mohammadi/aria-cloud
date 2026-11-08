'use client';

import React, { useState } from 'react';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import Container from '@cloudscape-design/components/container';
import Form from '@cloudscape-design/components/form';
import FormField from '@cloudscape-design/components/form-field';
import Input from '@cloudscape-design/components/input';
import Select, { SelectProps } from '@cloudscape-design/components/select';
import Button from '@cloudscape-design/components/button';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Grid from '@cloudscape-design/components/grid';
import Table from '@cloudscape-design/components/table';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import Badge from '@cloudscape-design/components/badge';
import Box from '@cloudscape-design/components/box';
import Flashbar, { FlashbarProps } from '@cloudscape-design/components/flashbar';
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs';
import Link from '@cloudscape-design/components/link';
import { useTranslation } from '@aria-cloud/ui';

interface MailboxRow {
  mailboxId: string;
  emailAddress: string;
  quotaMb: number;
  protocols: string;
  dkimStatus: string;
}

interface DnsRecordRow {
  type: string;
  host: string;
  value: string;
}

const DOMAIN_OPTIONS: SelectProps.Option[] = [
  {
    value: 'kabul-saffron.ariacloudservices.org',
    label: 'kabul-saffron.ariacloudservices.org',
  },
  {
    value: 'ariacloudservices.org',
    label: 'ariacloudservices.org',
  },
];

const ARIA_DNS_EMAIL_RECORDS: DnsRecordRow[] = [
  {
    type: 'A',
    host: 'mail.ariacloudservices.org.',
    value: 'mail-edge.ariacloudservices.org',
  },
  {
    type: 'MX',
    host: 'ariacloudservices.org.',
    value: '10 mx.ariacloudservices.org.',
  },
  {
    type: 'TXT (SPF)',
    host: 'ariacloudservices.org.',
    value: '"v=spf1 include:spf.ariacloudservices.org ~all"',
  },
  {
    type: 'TXT (DMARC)',
    host: '_dmarc.ariacloudservices.org.',
    value:
      '"v=DMARC1; p=quarantine; rua=mailto:postmaster@ariacloudservices.org; pct=100;"',
  },
  {
    type: 'CNAME (DKIM)',
    host: 'dkim._domainkey.ariacloudservices.org.',
    value: 'dkim.ariacloudservices.org.',
  },
];

export default function BusinessEmailPage() {
  const { t, dir } = useTranslation();

  const [localPart, setLocalPart] = useState<string>('exports');
  const [selectedDomain, setSelectedDomain] = useState<SelectProps.Option>(
    DOMAIN_OPTIONS[0]
  );
  const [quotaMb, setQuotaMb] = useState<string>('5120');
  const [provisioning, setProvisioning] = useState<boolean>(false);

  const [mailboxes, setMailboxes] = useState<MailboxRow[]>([
    {
      mailboxId: 'mbx_kabul_sales01',
      emailAddress: 'sales@kabul-saffron.ariacloudservices.org',
      quotaMb: 5120,
      protocols: 'JMAP / IMAP 993 / SMTP 587',
      dkimStatus: t.infra.statusConfigured,
    },
    {
      mailboxId: 'mbx_kabul_info02',
      emailAddress: 'info@kabul-saffron.ariacloudservices.org',
      quotaMb: 5120,
      protocols: 'JMAP / IMAP 993 / SMTP 587',
      dkimStatus: t.infra.statusConfigured,
    },
  ]);

  const [flashItems, setFlashItems] = useState<
    FlashbarProps.MessageDefinition[]
  >([]);

  const handleProvisionMailbox = async () => {
    setProvisioning(true);
    try {
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'provision_mailbox',
          localPart,
          domain: selectedDomain.value,
          quotaMb: Number(quotaMb) || 5120,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.common.error);

      setMailboxes((prev) => [
        {
          mailboxId: data.mailboxId,
          emailAddress: data.emailAddress,
          quotaMb: data.quotaMb,
          protocols: 'JMAP / IMAP 993 / SMTP 587',
          dkimStatus: t.infra.statusConfigured,
        },
        ...prev,
      ]);

      setFlashItems([
        {
          id: data.mailboxId,
          type: 'success',
          dismissible: true,
          onDismiss: () => setFlashItems([]),
          header: `${t.nav.email} — ${t.common.success}`,
          content: data.emailAddress,
        },
      ]);
    } catch (err) {
      setFlashItems([
        {
          id: 'err-mbx',
          type: 'error',
          dismissible: true,
          onDismiss: () => setFlashItems([]),
          header: t.common.error,
          content: err instanceof Error ? err.message : t.common.error,
        },
      ]);
    } finally {
      setProvisioning(false);
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
              description={t.infra.headerDesc}
              actions={
                <Button
                  iconName="external"
                  href="https://mail.ariacloudservices.org"
                  target="_blank"
                >
                  mail.ariacloudservices.org
                </Button>
              }
            >
              {t.nav.email}
            </Header>
          </SpaceBetween>
        }
      >
        <SpaceBetween size="l">
          <Grid
            gridDefinition={[
              { colspan: { default: 12, m: 7 } },
              { colspan: { default: 12, m: 5 } },
            ]}
          >
            <Form
              actions={
                <Button
                  variant="primary"
                  loading={provisioning}
                  onClick={handleProvisionMailbox}
                >
                  {t.common.save}
                </Button>
              }
            >
              <Container header={<Header variant="h2">{t.nav.email}</Header>}>
                <SpaceBetween size="m">
                  <FormField label={t.nav.email}>
                    <Input
                      value={localPart}
                      onChange={({ detail }) => setLocalPart(detail.value)}
                      placeholder="sales"
                    />
                  </FormField>
                  <FormField label={t.nav.domains}>
                    <Select
                      selectedOption={selectedDomain}
                      onChange={({ detail }) =>
                        setSelectedDomain(detail.selectedOption)
                      }
                      options={DOMAIN_OPTIONS}
                    />
                  </FormField>
                  <FormField label={t.canvasModal.remainingQuotaLabel}>
                    <Input
                      value={quotaMb}
                      onChange={({ detail }) => setQuotaMb(detail.value)}
                      inputMode="numeric"
                    />
                  </FormField>
                </SpaceBetween>
              </Container>
            </Form>

            <Container
              header={<Header variant="h2">{t.infra.headerTitle}</Header>}
            >
              <KeyValuePairs
                columns={1}
                items={[
                  {
                    label: t.infra.colTarget,
                    value: (
                      <Link href="https://mail.ariacloudservices.org" external>
                        https://mail.ariacloudservices.org
                      </Link>
                    ),
                  },
                  {
                    label: t.infra.colComponent,
                    value: (
                      <Box variant="code">
                        no-reply@ariacloudservices.org | support@ariacloudservices.org
                      </Box>
                    ),
                  },
                  {
                    label: t.infra.colStatus,
                    value: (
                      <StatusIndicator type="success">
                        {t.infra.statusConfigured}
                      </StatusIndicator>
                    ),
                  },
                ]}
              />
            </Container>
          </Grid>

          <Table
            header={
              <Header variant="h2" counter={`(${mailboxes.length})`}>
                {t.nav.email}
              </Header>
            }
            columnDefinitions={[
              {
                id: 'email',
                header: t.infra.colTarget,
                cell: (item) => (
                  <Box variant="code" fontWeight="bold">
                    {item.emailAddress}
                  </Box>
                ),
              },
              {
                id: 'protocols',
                header: t.infra.colComponent,
                cell: (item) => <Badge color="blue">{item.protocols}</Badge>,
              },
              {
                id: 'dkim',
                header: t.infra.colStatus,
                cell: (item) => (
                  <StatusIndicator type="success">
                    {item.dkimStatus}
                  </StatusIndicator>
                ),
              },
            ]}
            items={mailboxes}
          />

          <Table
            header={<Header variant="h3">{t.nav.domains}</Header>}
            columnDefinitions={[
              {
                id: 'type',
                header: t.infra.colComponent,
                cell: (item) => <Badge color="grey">{item.type}</Badge>,
              },
              {
                id: 'host',
                header: t.infra.colTarget,
                cell: (item) => <Box variant="code">{item.host}</Box>,
              },
              {
                id: 'value',
                header: t.infra.colStatus,
                cell: (item) => <Box variant="code">{item.value}</Box>,
              },
            ]}
            items={ARIA_DNS_EMAIL_RECORDS}
          />
        </SpaceBetween>
      </ContentLayout>
    </div>
  );
}
