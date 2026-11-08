'use client';

import React, { useState } from 'react';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import Container from '@cloudscape-design/components/container';
import Form from '@cloudscape-design/components/form';
import FormField from '@cloudscape-design/components/form-field';
import Input from '@cloudscape-design/components/input';
import Textarea from '@cloudscape-design/components/textarea';
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
import Link from '@cloudscape-design/components/link';
import { useTranslation } from '@aria-cloud/ui';

interface StorefrontDeploymentRow {
  deploymentId: string;
  subdomainSlug: string;
  liveUrl: string;
  edgeObjectKey: string;
  cachePurgeId: string;
}

export default function StoreBuilderPage() {
  const { t, dir } = useTranslation();

  const [subdomainSlug, setSubdomainSlug] = useState<string>('kabul-saffron');
  const [businessName, setBusinessName] =
    useState<string>('Kabul Saffron Co.');
  const [whatsappPhone, setWhatsappPhone] = useState<string>('+93700123456');
  const [hesabPayId, setHesabPayId] = useState<string>('HP-KABUL-9921');
  const [palette, setPalette] = useState<string>('emerald-gold');
  const [storePrompt, setStorePrompt] = useState<string>(
    t.canvasModal.promptDefault
  );
  const [building, setBuilding] = useState<boolean>(false);

  const [deployments, setDeployments] = useState<StorefrontDeploymentRow[]>([
    {
      deploymentId: 'dep_aria_kabul01',
      subdomainSlug: 'kabul-saffron',
      liveUrl: 'https://kabul-saffron.ariacloudservices.org',
      edgeObjectKey: 'sites/kabul-saffron/index.html',
      cachePurgeId: 'EDGE-29981ABCDEF',
    },
  ]);

  const [flashItems, setFlashItems] = useState<
    FlashbarProps.MessageDefinition[]
  >([]);

  const handleBuildStorefront = async () => {
    setBuilding(true);
    try {
      const res = await fetch('/api/studio/site-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomainSlug,
          businessName,
          prompt: storePrompt,
          palette,
          whatsappPhone,
          hesabPayMerchantId: hesabPayId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.common.error);

      setDeployments((prev) => [
        {
          deploymentId: data.deploymentId,
          subdomainSlug: data.subdomainSlug,
          liveUrl: data.liveUrl,
          edgeObjectKey: data.edgeObjectKey,
          cachePurgeId: data.edgeInvalidationId,
        },
        ...prev,
      ]);

      setFlashItems([
        {
          id: data.deploymentId,
          type: 'success',
          dismissible: true,
          onDismiss: () => setFlashItems([]),
          header: `${t.nav.storefront} — ${t.common.success}`,
          content: data.liveUrl,
        },
      ]);
    } catch (err) {
      setFlashItems([
        {
          id: 'err-build',
          type: 'error',
          dismissible: true,
          onDismiss: () => setFlashItems([]),
          header: t.common.error,
          content: err instanceof Error ? err.message : t.common.error,
        },
      ]);
    } finally {
      setBuilding(false);
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
                <Badge color="green">*.ariacloudservices.org</Badge>
              }
            >
              {t.nav.storefront}
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
                  iconName="upload"
                  loading={building}
                  onClick={handleBuildStorefront}
                >
                  {t.common.save}
                </Button>
              }
            >
              <Container
                header={<Header variant="h2">{t.nav.domains}</Header>}
              >
                <SpaceBetween size="m">
                  <FormField label={t.nav.domains}>
                    <Input
                      value={subdomainSlug}
                      onChange={({ detail }) => setSubdomainSlug(detail.value)}
                      placeholder={t.nav.searchPlaceholder}
                    />
                  </FormField>
                  <FormField label={t.appTitle}>
                    <Input
                      value={businessName}
                      onChange={({ detail }) => setBusinessName(detail.value)}
                      placeholder={t.appTitle}
                    />
                  </FormField>
                  <FormField label={t.canvasModal.qualityLabel}>
                    <Tiles
                      value={palette}
                      onChange={({ detail }) => setPalette(detail.value)}
                      items={[
                        {
                          value: 'emerald-gold',
                          label: 'Emerald & Saffron Gold',
                        },
                        {
                          value: 'lapis-amber',
                          label: 'Lapis & Amber',
                        },
                      ]}
                    />
                  </FormField>
                  <FormField label={t.canvasModal.promptLabel}>
                    <Textarea
                      value={storePrompt}
                      onChange={({ detail }) => setStorePrompt(detail.value)}
                      placeholder={t.canvasModal.promptDefault}
                      rows={3}
                    />
                  </FormField>
                  <Grid
                    gridDefinition={[
                      { colspan: { default: 12, s: 6 } },
                      { colspan: { default: 12, s: 6 } },
                    ]}
                  >
                    <FormField label={t.leads.cardTitle}>
                      <Input
                        value={whatsappPhone}
                        onChange={({ detail }) =>
                          setWhatsappPhone(detail.value)
                        }
                        placeholder="+93700123456"
                      />
                    </FormField>
                    <FormField label={t.nav.hesabpay}>
                      <Input
                        value={hesabPayId}
                        onChange={({ detail }) => setHesabPayId(detail.value)}
                        placeholder="HP-KABUL-9921"
                      />
                    </FormField>
                  </Grid>
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
                      <Link
                        href={`https://${subdomainSlug || 'kabul-saffron'}.ariacloudservices.org`}
                        external
                      >
                        https://{subdomainSlug || 'kabul-saffron'}.ariacloudservices.org
                      </Link>
                    ),
                  },
                  {
                    label: t.infra.colComponent,
                    value: <Box variant="code">edge.ariacloudservices.org</Box>,
                  },
                  {
                    label: t.infra.colStatus,
                    value: (
                      <StatusIndicator type="success">
                        {t.infra.statusHealthy}
                      </StatusIndicator>
                    ),
                  },
                ]}
              />
            </Container>
          </Grid>

          <Table
            header={
              <Header variant="h3" counter={`(${deployments.length})`}>
                {t.nav.storefront}
              </Header>
            }
            columnDefinitions={[
              {
                id: 'liveUrl',
                header: t.infra.colTarget,
                cell: (item) => (
                  <Link href={item.liveUrl} external>
                    {item.liveUrl}
                  </Link>
                ),
              },
              {
                id: 'edgeObjectKey',
                header: t.infra.colComponent,
                cell: (item) => <Box variant="code">{item.edgeObjectKey}</Box>,
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
            items={deployments}
          />
        </SpaceBetween>
      </ContentLayout>
    </div>
  );
}
