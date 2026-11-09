'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Container from '@cloudscape-design/components/container';
import Header from '@cloudscape-design/components/header';
import Table, { TableProps } from '@cloudscape-design/components/table';
import Cards from '@cloudscape-design/components/cards';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Grid from '@cloudscape-design/components/grid';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import ProgressBar from '@cloudscape-design/components/progress-bar';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Badge from '@cloudscape-design/components/badge';
import FormField from '@cloudscape-design/components/form-field';
import Input from '@cloudscape-design/components/input';
import Textarea from '@cloudscape-design/components/textarea';
import Select, { SelectProps } from '@cloudscape-design/components/select';
import Alert from '@cloudscape-design/components/alert';
import Modal from '@cloudscape-design/components/modal';
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs';
import Link from '@cloudscape-design/components/link';
import * as awsui from '@cloudscape-design/design-tokens';
import { useTranslation } from '@aria-cloud/ui';
import { AccountSummary } from '@/components/AccountSummary';

interface InfraComponentRow {
  id: string;
  name: string;
  target: string;
  statusType: 'success' | 'info';
  statusText: string;
  latency: number;
}

interface WhatsAppLeadItem {
  id: string;
  customerPhone: string;
  transcript: string;
  timestamp: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { t, dir } = useTranslation();

  // Handshake / Cash OTP & HesabPay state
  const [handshakeVerified, setHandshakeVerified] = useState<boolean>(false);
  const [otpCode, setOtpCode] = useState<string>('849201');
  const [hesabpayModalOpen, setHesabpayModalOpen] = useState<boolean>(false);

  // Latency state for live refresh
  const [latencyOffset, setLatencyOffset] = useState<number>(0);

  // Aria Creative Studio Modal state
  const [canvasModalOpen, setCanvasModalOpen] = useState<boolean>(false);
  const [canvasPrompt, setCanvasPrompt] = useState<string>('');
  const [canvasAspectRatio, setCanvasAspectRatio] =
    useState<SelectProps.Option>({
      value: '1:1',
      label: '1024 × 1024 (1:1)',
    });
  const [canvasRendering, setCanvasRendering] = useState<boolean>(false);
  const [generatedVisualUrl, setGeneratedVisualUrl] = useState<string | null>(
    null
  );
  const [canvasQuotaRemaining, setCanvasQuotaRemaining] = useState<number>(9);

  // Infrastructure & Service Health rows using strictly Aria-branded names from `t`
  const infraRows: InfraComponentRow[] = [
    {
      id: 'edge-store',
      name: t.nav.storefront,
      target: 'https://kabul-saffron.ariacloudservices.org',
      statusType: 'success',
      statusText: t.infra.statusHealthy,
      latency: 24 + latencyOffset,
    },
    {
      id: 'domain-dns',
      name: t.nav.domains,
      target: 'ariacloudservices.org (*.ariacloudservices.org)',
      statusType: 'success',
      statusText: t.infra.statusConfigured,
      latency: 18 + latencyOffset,
    },
    {
      id: 'cloud-mail',
      name: t.nav.email,
      target: 'sales@kabul-saffron.ariacloudservices.org',
      statusType: 'success',
      statusText: t.infra.statusActive,
      latency: 39 + latencyOffset,
    },
    {
      id: 'core-ai',
      name: t.nav.aiChat,
      target: 'https://api.ariacloudservices.org/v1/ai',
      statusType: 'success',
      statusText: t.infra.statusHealthy,
      latency: 64 + latencyOffset,
    },
    {
      id: 'voice-engine',
      name: t.nav.aiVoice,
      target: 'https://cdn.ariacloudservices.org/audio-edge',
      statusType: 'success',
      statusText: t.infra.statusActive,
      latency: 71 + latencyOffset,
    },
  ];

  // Rule 1: Table Column Definitions Must Pull from `t`
  const columnDefinitions: TableProps.ColumnDefinition<InfraComponentRow>[] = [
    {
      id: 'component',
      header: t.infra.colComponent,
      cell: (item) => (
        <div className="ps-3 pe-3 text-start">
          <Box fontWeight="bold">{item.name}</Box>
        </div>
      ),
    },
    {
      id: 'target',
      header: t.infra.colTarget,
      cell: (item) => (
        <div className="ps-3 pe-3 text-start">
          <Box variant="code" fontSize="body-s">
            {item.target}
          </Box>
        </div>
      ),
    },
    {
      id: 'status',
      header: t.infra.colStatus,
      cell: (item) => (
        <div className="ps-3 pe-3 text-start">
          <StatusIndicator type={item.statusType}>
            {item.statusText}
          </StatusIndicator>
        </div>
      ),
    },
    {
      id: 'latency',
      header: t.infra.colLatency,
      cell: (item) => (
        <div className="ps-3 pe-3 text-start">
          <Badge color="blue">{`${item.latency} ${t.common.ms}`}</Badge>
        </div>
      ),
    },
  ];

  const inboundLeads: WhatsAppLeadItem[] = [
    {
      id: 'lead-kbl-01',
      customerPhone: '+93 70 412 8890 (Kabul)',
      transcript: '25g Super Negin Herat Saffron Gift Box — 4,500 AFN',
      timestamp: '00:02',
    },
    {
      id: 'lead-hrt-02',
      customerPhone: '+93 79 901 3341 (Herat)',
      transcript: '50g Wholesale Saffron Export Tin — 5,400 AFN',
      timestamp: '00:14',
    },
  ];

  const handleVerifyCashHandshake = () => {
    if (/^\d{6}$/.test(otpCode.trim())) {
      setHandshakeVerified(true);
    }
  };

  const handleSimulateHesabpayApproval = () => {
    setHandshakeVerified(true);
    setHesabpayModalOpen(false);
  };

  const handleGenerateVisual = async () => {
    setCanvasRendering(true);
    try {
      const promptToUse = canvasPrompt.trim() || t.canvasModal.promptDefault;
      const res = await fetch('/api/studio/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToUse,
          resolution:
            canvasAspectRatio.value === '16:9' ? '1280x720' : '1024x1024',
        }),
      });
      const data = await res.json();
      if (res.ok && data.imageUrl) {
        setGeneratedVisualUrl(data.imageUrl);
        setCanvasQuotaRemaining((prev) => Math.max(0, prev - 1));
      }
    } finally {
      setCanvasRendering(false);
    }
  };

  return (
    <div dir={dir} className="text-start start-0 end-0">
      <AccountSummary />

      <ContentLayout
        header={
          <SpaceBetween size="m">
            <Alert
              type={handshakeVerified ? 'success' : 'warning'}
              header={
                handshakeVerified
                  ? t.alerts.verifiedSuccessTitle
                  : t.alerts.cashPendingTitle
              }
              action={
                !handshakeVerified ? (
                  <Button onClick={handleVerifyCashHandshake}>
                    {t.alerts.verifyCodeBtn}
                  </Button>
                ) : undefined
              }
            >
              {handshakeVerified
                ? t.alerts.verifiedSuccessBody
                : t.alerts.cashPendingBody}
            </Alert>

            <Header
              variant="h1"
              description={t.tagline}
              actions={
                <SpaceBetween direction="horizontal" size="xs">
                  <Button
                    iconName="refresh"
                    onClick={() =>
                      setLatencyOffset((prev) => (prev === 0 ? 3 : 0))
                    }
                  >
                    {t.infra.refreshLatencyBtn}
                  </Button>
                  <Button
                    variant="primary"
                    iconName="external"
                    href="https://kabul-saffron.ariacloudservices.org"
                    target="_blank"
                  >
                    {t.infra.viewLiveStore}
                  </Button>
                </SpaceBetween>
              }
            >
              {t.appTitle}
            </Header>
          </SpaceBetween>
        }
      >
        <SpaceBetween size="l">
          {/* SECTION 1: Aria Core Infrastructure & Service Health Table */}
          <Table
            header={
              <Header
                variant="h2"
                description={t.infra.headerDesc}
                actions={
                  <Link
                    onFollow={(e) => {
                      e.preventDefault();
                      router.push('/store-builder');
                    }}
                  >
                    {t.infra.manageDnsLink}
                  </Link>
                }
              >
                {t.infra.headerTitle}
              </Header>
            }
            columnDefinitions={columnDefinitions}
            items={infraRows}
          />

          {/* SECTION 2: Aria AI Studio Consumption & Localized Billing */}
          <Grid
            gridDefinition={[
              { colspan: { default: 12, m: 7 } },
              { colspan: { default: 12, m: 5 } },
            ]}
          >
            {/* Aria AI Studio Consumption & Quotas */}
            <Container
              header={
                <Header
                  variant="h2"
                  description={t.aiStudio.cardDesc}
                  actions={
                    <SpaceBetween direction="horizontal" size="xs">
                      <Badge color="blue">{t.aiStudio.tierBadge}</Badge>
                      <Button
                        onClick={() => {
                          setCanvasPrompt(t.canvasModal.promptDefault);
                          setCanvasModalOpen(true);
                        }}
                      >
                        {t.aiStudio.generateImageBtn}
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => router.push('/ai-studio')}
                      >
                        {t.aiStudio.openStudioBtn}
                      </Button>
                    </SpaceBetween>
                  }
                >
                  {t.aiStudio.cardTitle}
                </Header>
              }
            >
              <SpaceBetween size="m">
                <div className="ps-3 pe-3">
                  <ProgressBar
                    label={t.aiStudio.textTokensLabel}
                    description={t.aiStudio.textTokensDesc}
                    value={34}
                    status="in-progress"
                  />
                </div>
                <div className="ps-3 pe-3">
                  <ProgressBar
                    label={t.aiStudio.canvasImagesLabel}
                    description={t.aiStudio.canvasImagesDesc}
                    value={70}
                    status="in-progress"
                  />
                </div>
                <div className="ps-3 pe-3">
                  <SpaceBetween size="xs">
                    <ProgressBar
                      label={t.aiStudio.voiceCharsLabel}
                      description={t.aiStudio.voiceCharsDesc}
                      value={16}
                      status="in-progress"
                    />
                    <Badge color="green">{t.aiStudio.voiceCacheBadge}</Badge>
                  </SpaceBetween>
                </div>
                <Alert type="info">{t.aiStudio.architectureNote}</Alert>
              </SpaceBetween>
            </Container>

            {/* Localized Billing (AFN) Card */}
            <Container
              header={
                <Header variant="h2" description={t.billing.cardDesc}>
                  {t.billing.cardTitle}
                </Header>
              }
            >
              <SpaceBetween size="m">
                <KeyValuePairs
                  columns={2}
                  items={[
                    {
                      label: t.billing.activePlanLabel,
                      value: (
                        <Box variant="code" fontWeight="bold">
                          #INV-2026-1108 ({t.billing.currentPlanName})
                        </Box>
                      ),
                    },
                    {
                      label: t.billing.renewalCostLabel,
                      value: (
                        <Box fontWeight="bold" color="text-status-info">
                          {t.billing.renewalCostValue}
                        </Box>
                      ),
                    },
                    {
                      label: t.billing.coverageExpiryLabel,
                      value: (
                        <StatusIndicator
                          type={handshakeVerified ? 'success' : 'info'}
                        >
                          {handshakeVerified
                            ? t.alerts.verifiedSuccessTitle
                            : t.infra.statusActive}
                        </StatusIndicator>
                      ),
                    },
                  ]}
                />

                {/* Rule 2: Input Placeholders & Form Hints Must Pull from `t` */}
                <FormField
                  label={t.billing.cashOtpLabel}
                  description={t.billing.cashHint}
                >
                  <SpaceBetween direction="horizontal" size="xs">
                    <Input
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.detail.value)}
                      placeholder={t.billing.cashOtpPlaceholder}
                      ariaLabel={t.billing.cashOtpLabel}
                      inputMode="numeric"
                    />
                    <Button
                      variant="primary"
                      onClick={handleVerifyCashHandshake}
                    >
                      {t.billing.cashVerifyBtn}
                    </Button>
                  </SpaceBetween>
                </FormField>

                <Button
                  iconName="external"
                  onClick={() => setHesabpayModalOpen(true)}
                >
                  {t.billing.payHesabpayBtn}
                </Button>
              </SpaceBetween>
            </Container>
          </Grid>

          {/* SECTION 3: Live Inbound WhatsApp Stream */}
          <Cards
            header={
              <Header
                variant="h2"
                description={t.leads.cardDesc}
                actions={
                  <SpaceBetween direction="horizontal" size="xs">
                    <Badge color="green">{t.leads.liveBadge}</Badge>
                    <Link
                      onFollow={(e) => {
                        e.preventDefault();
                        router.push('/ai-studio');
                      }}
                    >
                      {t.leads.viewAuditLink}
                    </Link>
                  </SpaceBetween>
                }
              >
                {t.leads.cardTitle}
              </Header>
            }
            cardDefinition={{
              header: (item) => (
                <div className="ps-3 pe-3 text-start">
                  <SpaceBetween direction="horizontal" size="xs">
                    <Box fontWeight="bold">{item.customerPhone}</Box>
                    <Badge color="blue">{t.leads.orderIntentTag}</Badge>
                    <Badge color="green">{t.leads.autoRepliedTag}</Badge>
                  </SpaceBetween>
                </div>
              ),
              sections: [
                {
                  id: 'transcript',
                  header: t.leads.voiceNoteTranscribed,
                  content: (item) => (
                    <div className="ps-3 pe-3 text-start">
                      <SpaceBetween size="xs">
                        <Box variant="p">{item.transcript}</Box>
                        <Button
                          iconName="audio-full"
                          onClick={() => router.push('/ai-studio')}
                        >
                          {t.leads.listenAudioBtn}
                        </Button>
                      </SpaceBetween>
                    </div>
                  ),
                },
              ],
            }}
            cardsPerRow={[{ cards: 1 }, { minWidth: 500, cards: 2 }]}
            items={inboundLeads}
          />
        </SpaceBetween>

        {/* Modal 1: HesabPay Digital Checkout */}
        <Modal
          visible={hesabpayModalOpen}
          onDismiss={() => setHesabpayModalOpen(false)}
          header={t.billing.hesabpayModalTitle}
          footer={
            <SpaceBetween direction="horizontal" size="xs">
              <Button
                variant="link"
                onClick={() => setHesabpayModalOpen(false)}
              >
                {t.billing.closeBtn}
              </Button>
              <Button
                variant="primary"
                onClick={handleSimulateHesabpayApproval}
              >
                {t.billing.simulateApprovalBtn}
              </Button>
            </SpaceBetween>
          }
        >
          <SpaceBetween size="m">
            <Box variant="p">{t.billing.hesabpayModalDesc}</Box>
            <div
              className="ps-4 pe-4 text-start"
              style={{
                border: `1px solid ${awsui.colorBorderDividerDefault}`,
                borderRadius: '8px',
                padding: '16px',
              }}
            >
              <Box variant="code">
                https://pay.hesabpay.com/checkout/INV-2026-1108
              </Box>
              <Box variant="h4">{t.billing.renewalCostValue}</Box>
            </div>
          </SpaceBetween>
        </Modal>

        {/* Modal 2: Aria Creative Studio Visual Generator */}
        <Modal
          visible={canvasModalOpen}
          onDismiss={() => setCanvasModalOpen(false)}
          header={t.canvasModal.modalTitle}
          footer={
            <SpaceBetween direction="horizontal" size="xs">
              <Button
                variant="link"
                onClick={() => setCanvasModalOpen(false)}
              >
                {t.canvasModal.cancelBtn}
              </Button>
              <Button
                variant="primary"
                loading={canvasRendering}
                onClick={handleGenerateVisual}
              >
                {t.canvasModal.generateActionBtn}
              </Button>
            </SpaceBetween>
          }
        >
          <SpaceBetween size="m">
            <FormField label={t.canvasModal.promptLabel}>
              <Textarea
                value={canvasPrompt}
                onChange={({ detail }) => setCanvasPrompt(detail.value)}
                placeholder={t.canvasModal.promptDefault}
                ariaLabel={t.canvasModal.promptLabel}
                rows={3}
              />
            </FormField>

            <Grid
              gridDefinition={[
                { colspan: { default: 12, s: 6 } },
                { colspan: { default: 12, s: 6 } },
              ]}
            >
              <FormField label={t.canvasModal.aspectRatioLabel}>
                <Select
                  selectedOption={canvasAspectRatio}
                  onChange={({ detail }) =>
                    setCanvasAspectRatio(detail.selectedOption)
                  }
                  options={[
                    { value: '1:1', label: '1024 × 1024 (1:1)' },
                    { value: '16:9', label: '1280 × 720 (16:9)' },
                  ]}
                />
              </FormField>
              <FormField label={t.canvasModal.qualityLabel}>
                <Badge color="blue">{t.nav.aiCanvas}</Badge>
              </FormField>
            </Grid>

            <Box variant="p">
              {canvasRendering
                ? t.canvasModal.renderingText
                : generatedVisualUrl
                  ? generatedVisualUrl
                  : t.canvasModal.emptyStateText}
            </Box>

            <Badge color="green">
              {`${t.canvasModal.remainingQuotaLabel} ${canvasQuotaRemaining}`}
            </Badge>
          </SpaceBetween>
        </Modal>
      </ContentLayout>
    </div>
  );
}
