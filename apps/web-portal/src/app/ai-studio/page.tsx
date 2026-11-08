'use client';

import React, { useState } from 'react';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import Tabs from '@cloudscape-design/components/tabs';
import Container from '@cloudscape-design/components/container';
import Form from '@cloudscape-design/components/form';
import FormField from '@cloudscape-design/components/form-field';
import Select, { SelectProps } from '@cloudscape-design/components/select';
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
import { useTranslation } from '@aria-cloud/ui';

interface VoiceJobRow {
  jobId: string;
  voiceName: string;
  modelId: string;
  locale: string;
  charCount: number;
  creditsDeducted: number;
  audioUrl: string;
  createdAt: string;
}

interface ImageJobRow {
  jobId: string;
  prompt: string;
  resolution: string;
  creditsDeducted: number;
  imageUrl: string;
  createdAt: string;
}

interface AssistantTurn {
  id: string;
  role: string;
  modelId: string;
  text: string;
  voiceReplyUrl: string | null;
  creditsDeducted: number;
  timestamp: string;
}

const VOICE_OPTIONS: SelectProps.Option[] = [
  {
    value: 'aria-walid-kabul',
    label: 'Aria Walid (Kabul Broadcast — Male)',
    description: 'Authoritative Dari, Pashto & English commercial voice',
  },
  {
    value: 'aria-maryam-herat',
    label: 'Aria Maryam (Herat Narrative — Female)',
    description: 'Warm conversational customer support & educational narration',
  },
  {
    value: 'aria-rostam-kandahar',
    label: 'Aria Rostam (Kandahar Commerce — Male)',
    description: 'Dynamic retail promo & WhatsApp voice note specialist',
  },
];

const MODEL_OPTIONS: SelectProps.Option[] = [
  {
    value: 'aria-voice-flash-v2.5',
    label: 'Aria Voice Flash v2.5 (~75ms — 0.5x Credit Rate)',
    description: 'Ultra-low latency streaming for WhatsApp voice notes & interactive IVR',
  },
  {
    value: 'aria-voice-studio-v2',
    label: 'Aria Voice Studio v2 (~650ms — 1.0x Credit Rate)',
    description: 'Studio broadcast emotional fidelity for Dari, Pashto & English ads',
  },
];

const CORE_AI_MODEL_OPTIONS: SelectProps.Option[] = [
  {
    value: 'aria-core-v1',
    label: 'Aria Core AI v1 (5 credits / 1k words)',
    description: 'Fastest daily assistant, WhatsApp voice-note replies & Dari/Pashto translation',
  },
  {
    value: 'aria-vision-v1',
    label: 'Aria Vision & Scanner v1 (10 credits / 1k words)',
    description: 'Multimodal document analysis, invoice OCR & business planning',
  },
  {
    value: 'aria-commerce-pro-v1',
    label: 'Aria Commerce Reasoning v1 (15 credits / 1k words)',
    description: 'Structured catalog extraction & export compliance analysis',
  },
];

export default function AiStudioPage() {
  const { t, language, dir } = useTranslation();

  const [selectedVoice, setSelectedVoice] = useState<SelectProps.Option>(
    VOICE_OPTIONS[0]
  );
  const [selectedVoiceModel, setSelectedVoiceModel] =
    useState<SelectProps.Option>(MODEL_OPTIONS[0]);
  const [voiceScript, setVoiceScript] = useState<string>(
    'به پلتفرم آریا کلاود (ariacloudservices.org) خوش آمدید. زعفران درجه یک هرات با بسته‌بندی صادراتی و پرداخت آنی حساب‌پی آماده ارسال است.'
  );
  const [voiceLoading, setVoiceLoading] = useState<boolean>(false);
  const [voiceHistory, setVoiceHistory] = useState<VoiceJobRow[]>([
    {
      jobId: 'job_aria_voice_kabul01',
      voiceName: 'Aria Walid (Kabul Broadcast)',
      modelId: 'aria-voice-flash-v2.5',
      locale: 'da',
      charCount: 132,
      creditsDeducted: 66,
      audioUrl:
        'https://cdn.ariacloudservices.org/tenants/9b2f4e10/audio/saffron-welcome-da.mp3',
      createdAt: '2026-11-08 01:40 UTC',
    },
  ]);

  const [imagePrompt, setImagePrompt] = useState<string>(
    t.canvasModal.promptDefault
  );
  const [imageResolution, setImageResolution] = useState<string>('1024x1024');
  const [imageLoading, setImageLoading] = useState<boolean>(false);
  const [imageHistory, setImageHistory] = useState<ImageJobRow[]>([
    {
      jobId: 'job_aria_studio_herat01',
      prompt: t.canvasModal.promptDefault,
      resolution: '1024x1024',
      creditsDeducted: 20,
      imageUrl:
        'https://cdn.ariacloudservices.org/tenants/9b2f4e10/images/herat-saffron-10g.png',
      createdAt: '2026-11-08 01:35 UTC',
    },
  ]);

  const [selectedAiModel, setSelectedAiModel] = useState<SelectProps.Option>(
    CORE_AI_MODEL_OPTIONS[0]
  );
  const [assistantInput, setAssistantInput] = useState<string>(
    '25g Royal Afghan Saffron Gift Box — 4,500 AFN'
  );
  const [assistantLoading, setAssistantLoading] = useState<boolean>(false);
  const [assistantTurns, setAssistantTurns] = useState<AssistantTurn[]>([
    {
      id: 'turn-init-1',
      role: t.nav.aiChat,
      modelId: 'aria-core-v1',
      text: t.aiStudio.architectureNote,
      voiceReplyUrl:
        'https://cdn.ariacloudservices.org/tenants/9b2f4e10/whatsapp/welcome.ogg',
      creditsDeducted: 5,
      timestamp: '2026-11-08 01:30 UTC',
    },
  ]);

  const [flashItems, setFlashItems] = useState<
    FlashbarProps.MessageDefinition[]
  >([]);

  const handleSynthesizeVoice = async () => {
    setVoiceLoading(true);
    try {
      const res = await fetch('/api/studio/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: voiceScript,
          voiceId: selectedVoice.value,
          modelId: selectedVoiceModel.value,
          locale: language,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.common.error);

      const newRow: VoiceJobRow = {
        jobId: data.jobId,
        voiceName: selectedVoice.label || t.nav.aiVoice,
        modelId: data.modelId,
        locale: data.locale,
        charCount: data.charCount,
        creditsDeducted: data.creditsDeducted,
        audioUrl: data.audioUrl,
        createdAt: new Date(data.createdAt).toLocaleTimeString(),
      };
      setVoiceHistory((prev) => [newRow, ...prev]);
      setFlashItems([
        {
          id: data.jobId,
          type: 'success',
          dismissible: true,
          onDismiss: () => setFlashItems([]),
          header: `${t.nav.aiVoice} — ${t.common.success}`,
          content: data.audioUrl,
        },
      ]);
    } catch (err) {
      setFlashItems([
        {
          id: 'err-voice',
          type: 'error',
          dismissible: true,
          onDismiss: () => setFlashItems([]),
          header: t.common.error,
          content: err instanceof Error ? err.message : t.common.error,
        },
      ]);
    } finally {
      setVoiceLoading(false);
    }
  };

  const handleGenerateImage = async () => {
    setImageLoading(true);
    try {
      const res = await fetch('/api/studio/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          resolution: imageResolution,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.common.error);

      const newRow: ImageJobRow = {
        jobId: data.jobId,
        prompt: data.prompt,
        resolution: `${data.width}x${data.height}`,
        creditsDeducted: data.creditsDeducted,
        imageUrl: data.imageUrl,
        createdAt: new Date(data.createdAt).toLocaleTimeString(),
      };
      setImageHistory((prev) => [newRow, ...prev]);
      setFlashItems([
        {
          id: data.jobId,
          type: 'success',
          dismissible: true,
          onDismiss: () => setFlashItems([]),
          header: `${t.nav.aiCanvas} — ${t.common.success}`,
          content: data.imageUrl,
        },
      ]);
    } catch (err) {
      setFlashItems([
        {
          id: 'err-img',
          type: 'error',
          dismissible: true,
          onDismiss: () => setFlashItems([]),
          header: t.common.error,
          content: err instanceof Error ? err.message : t.common.error,
        },
      ]);
    } finally {
      setImageLoading(false);
    }
  };

  const handleSendAssistant = async () => {
    if (!assistantInput.trim()) return;
    setAssistantLoading(true);
    try {
      const res = await fetch('/api/studio/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: assistantInput,
          modelId: selectedAiModel.value,
          language,
          voiceReply: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.common.error);

      const botTurn: AssistantTurn = {
        id: `bot-${Date.now()}`,
        role: t.nav.aiChat,
        modelId: data.modelId,
        text: data.replyText,
        voiceReplyUrl: data.voiceReplyUrl,
        creditsDeducted: data.creditsDeducted,
        timestamp: new Date(data.timestamp).toLocaleTimeString(),
      };
      setAssistantTurns((prev) => [botTurn, ...prev]);
    } catch (err) {
      setFlashItems([
        {
          id: 'err-bot',
          type: 'error',
          dismissible: true,
          onDismiss: () => setFlashItems([]),
          header: t.common.error,
          content: err instanceof Error ? err.message : t.common.error,
        },
      ]);
    } finally {
      setAssistantLoading(false);
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
              description={t.aiStudio.cardDesc}
              actions={<Badge color="blue">{t.aiStudio.tierBadge}</Badge>}
            >
              {t.nav.aiStudioHeader}
            </Header>
          </SpaceBetween>
        }
      >
        <Tabs
          tabs={[
            {
              id: 'voice',
              label: `🎙️ ${t.nav.aiVoice}`,
              content: (
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
                          loading={voiceLoading}
                          onClick={handleSynthesizeVoice}
                        >
                          {t.leads.listenAudioBtn}
                        </Button>
                      }
                    >
                      <Container
                        header={<Header variant="h2">{t.nav.aiVoice}</Header>}
                      >
                        <SpaceBetween size="m">
                          <FormField label={t.nav.aiVoice}>
                            <Select
                              selectedOption={selectedVoice}
                              onChange={({ detail }) =>
                                setSelectedVoice(detail.selectedOption)
                              }
                              options={VOICE_OPTIONS}
                            />
                          </FormField>
                          <FormField label={t.canvasModal.qualityLabel}>
                            <Select
                              selectedOption={selectedVoiceModel}
                              onChange={({ detail }) =>
                                setSelectedVoiceModel(detail.selectedOption)
                              }
                              options={MODEL_OPTIONS}
                            />
                          </FormField>
                          <FormField
                            label={t.aiStudio.voiceCharsLabel}
                            description={t.aiStudio.voiceCharsDesc}
                          >
                            <Textarea
                              value={voiceScript}
                              onChange={({ detail }) =>
                                setVoiceScript(detail.value)
                              }
                              rows={4}
                            />
                          </FormField>
                        </SpaceBetween>
                      </Container>
                    </Form>

                    <Container
                      header={
                        <Header variant="h2">{t.infra.headerTitle}</Header>
                      }
                    >
                      <KeyValuePairs
                        columns={1}
                        items={[
                          {
                            label: t.infra.colComponent,
                            value: t.nav.aiVoice,
                          },
                          {
                            label: t.infra.colTarget,
                            value: 'cdn.ariacloudservices.org/audio-edge',
                          },
                          {
                            label: t.infra.colStatus,
                            value: (
                              <StatusIndicator type="success">
                                {t.aiStudio.voiceCacheBadge}
                              </StatusIndicator>
                            ),
                          },
                        ]}
                      />
                    </Container>
                  </Grid>

                  <Table
                    header={
                      <Header
                        variant="h3"
                        counter={`(${voiceHistory.length})`}
                      >
                        {t.nav.aiVoice}
                      </Header>
                    }
                    columnDefinitions={[
                      {
                        id: 'voiceName',
                        header: t.infra.colComponent,
                        cell: (item) => item.voiceName,
                      },
                      {
                        id: 'audioUrl',
                        header: t.infra.colTarget,
                        cell: (item) => (
                          <Box variant="code">{item.audioUrl}</Box>
                        ),
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
                    items={voiceHistory}
                  />
                </SpaceBetween>
              ),
            },
            {
              id: 'image',
              label: `🎨 ${t.nav.aiCanvas}`,
              content: (
                <SpaceBetween size="l">
                  <Container
                    header={
                      <Header
                        variant="h2"
                        description={t.aiStudio.canvasImagesDesc}
                      >
                        {t.canvasModal.modalTitle}
                      </Header>
                    }
                  >
                    <Form
                      actions={
                        <Button
                          variant="primary"
                          loading={imageLoading}
                          onClick={handleGenerateImage}
                        >
                          {t.canvasModal.generateActionBtn}
                        </Button>
                      }
                    >
                      <SpaceBetween size="m">
                        <FormField label={t.canvasModal.aspectRatioLabel}>
                          <Tiles
                            value={imageResolution}
                            onChange={({ detail }) =>
                              setImageResolution(detail.value)
                            }
                            items={[
                              {
                                value: '1024x1024',
                                label: '1024 × 1024 (1:1)',
                              },
                              {
                                value: '1280x720',
                                label: '1280 × 720 (16:9)',
                              },
                            ]}
                          />
                        </FormField>
                        <FormField label={t.canvasModal.promptLabel}>
                          <Textarea
                            value={imagePrompt}
                            onChange={({ detail }) =>
                              setImagePrompt(detail.value)
                            }
                            placeholder={t.canvasModal.promptDefault}
                            rows={3}
                          />
                        </FormField>
                      </SpaceBetween>
                    </Form>
                  </Container>

                  <Table
                    header={
                      <Header
                        variant="h3"
                        counter={`(${imageHistory.length})`}
                      >
                        {t.nav.aiCanvas}
                      </Header>
                    }
                    columnDefinitions={[
                      {
                        id: 'prompt',
                        header: t.infra.colComponent,
                        cell: (item) => item.prompt,
                      },
                      {
                        id: 'imageUrl',
                        header: t.infra.colTarget,
                        cell: (item) => (
                          <Box variant="code">{item.imageUrl}</Box>
                        ),
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
                    items={imageHistory}
                  />
                </SpaceBetween>
              ),
            },
            {
              id: 'assistant',
              label: `💬 ${t.nav.aiChat}`,
              content: (
                <SpaceBetween size="l">
                  <Container
                    header={
                      <Header
                        variant="h2"
                        description={t.aiStudio.textTokensDesc}
                      >
                        {t.nav.aiChat}
                      </Header>
                    }
                  >
                    <Form
                      actions={
                        <Button
                          variant="primary"
                          loading={assistantLoading}
                          onClick={handleSendAssistant}
                        >
                          {t.aiStudio.openStudioBtn}
                        </Button>
                      }
                    >
                      <SpaceBetween size="m">
                        <FormField label={t.canvasModal.qualityLabel}>
                          <Select
                            selectedOption={selectedAiModel}
                            onChange={({ detail }) =>
                              setSelectedAiModel(detail.selectedOption)
                            }
                            options={CORE_AI_MODEL_OPTIONS}
                          />
                        </FormField>
                        <FormField label={t.aiStudio.textTokensLabel}>
                          <Textarea
                            value={assistantInput}
                            onChange={({ detail }) =>
                              setAssistantInput(detail.value)
                            }
                            rows={3}
                          />
                        </FormField>
                      </SpaceBetween>
                    </Form>
                  </Container>

                  <Table
                    header={
                      <Header
                        variant="h3"
                        counter={`(${assistantTurns.length})`}
                      >
                        {t.leads.cardTitle}
                      </Header>
                    }
                    columnDefinitions={[
                      {
                        id: 'role',
                        header: t.infra.colComponent,
                        cell: (item) => <Badge color="blue">{item.role}</Badge>,
                      },
                      {
                        id: 'text',
                        header: t.infra.colTarget,
                        cell: (item) => item.text,
                      },
                      {
                        id: 'status',
                        header: t.infra.colStatus,
                        cell: () => (
                          <StatusIndicator type="success">
                            {t.leads.autoRepliedTag}
                          </StatusIndicator>
                        ),
                      },
                    ]}
                    items={assistantTurns}
                  />
                </SpaceBetween>
              ),
            },
          ]}
        />
      </ContentLayout>
    </div>
  );
}
