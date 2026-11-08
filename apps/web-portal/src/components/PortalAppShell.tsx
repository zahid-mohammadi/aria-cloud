'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import AppLayout from '@cloudscape-design/components/app-layout';
import TopNavigation from '@cloudscape-design/components/top-navigation';
import SideNavigation, {
  SideNavigationProps,
} from '@cloudscape-design/components/side-navigation';
import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group';
import HelpPanel from '@cloudscape-design/components/help-panel';
import Box from '@cloudscape-design/components/box';
import Badge from '@cloudscape-design/components/badge';
import Input from '@cloudscape-design/components/input';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { Mode, Density } from '@cloudscape-design/global-styles';
import * as awsui from '@cloudscape-design/design-tokens';
import { Language, useTranslation } from '@aria-cloud/ui';
import { useCloudscapeTheme } from '../context/CloudscapeThemeContext';

export function PortalAppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { language, setLanguage, t, dir } = useTranslation();
  const {
    mode,
    toggleMode,
    density,
    toggleDensity,
    activeNavHref,
    setActiveNavHref,
  } = useCloudscapeTheme();

  const [navigationOpen, setNavigationOpen] = useState<boolean>(true);
  const [toolsOpen, setToolsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (pathname) {
      setActiveNavHref(pathname);
    }
  }, [pathname, setActiveNavHref]);

  const currentBreadcrumbText =
    activeNavHref === '/ai-studio'
      ? t.nav.aiStudioHeader
      : activeNavHref === '/store-builder'
        ? t.nav.storefront
        : activeNavHref === '/email'
          ? t.nav.email
          : activeNavHref === '/billing'
            ? t.nav.billingHeader
            : t.nav.dashboard;

  const sideNavItems: SideNavigationProps.Item[] = [
    {
      type: 'section',
      text: t.tagline,
      items: [
        { type: 'link', text: t.nav.dashboard, href: '/dashboard' },
        {
          type: 'link',
          text: t.nav.storefront,
          href: '/store-builder',
          info: <Badge color="green">*.ariacloudservices.org</Badge>,
        },
        {
          type: 'link',
          text: t.nav.domains,
          href: '/store-builder',
        },
        {
          type: 'link',
          text: t.nav.email,
          href: '/email',
          info: <Badge color="blue">DKIM</Badge>,
        },
      ],
    },
    {
      type: 'section',
      text: t.nav.aiStudioHeader,
      items: [
        {
          type: 'link',
          text: t.nav.aiChat,
          href: '/ai-studio',
        },
        {
          type: 'link',
          text: t.nav.aiCanvas,
          href: '/ai-studio',
        },
        {
          type: 'link',
          text: t.nav.aiVoice,
          href: '/ai-studio',
        },
        {
          type: 'link',
          text: t.nav.aiVision,
          href: '/ai-studio',
        },
      ],
    },
    {
      type: 'section',
      text: t.nav.billingHeader,
      items: [
        {
          type: 'link',
          text: t.nav.invoices,
          href: '/billing',
        },
        {
          type: 'link',
          text: t.nav.hesabpay,
          href: '/billing',
        },
        {
          type: 'link',
          text: t.nav.cashAudit,
          href: '/billing',
        },
      ],
    },
  ];

  return (
    <div
      dir={dir}
      className="text-start start-0 end-0"
      style={{
        minHeight: '100vh',
        backgroundColor: awsui.colorBackgroundLayoutMain,
        color: awsui.colorTextBodyDefault,
      }}
    >
      <div
        id="aria-cloudscape-top-nav"
        className="start-0 end-0"
        style={{ position: 'sticky', top: 0, zIndex: 1002 }}
      >
        <TopNavigation
          identity={{
            href: '/dashboard',
            title: `${t.appTitle} — ${t.tagline}`,
            onFollow: (e) => {
              e.preventDefault();
              setActiveNavHref('/dashboard');
              router.push('/dashboard');
            },
          }}
          search={
            <Input
              type="search"
              value={searchQuery}
              onChange={({ detail }) => setSearchQuery(detail.value)}
              placeholder={t.nav.searchPlaceholder}
              ariaLabel={t.nav.searchPlaceholder}
            />
          }
          utilities={[
            {
              type: 'menu-dropdown',
              text: `🌐 ${t.localeName} (${language.toUpperCase()})`,
              ariaLabel: t.localeName,
              onItemClick: ({ detail }) => {
                setLanguage(detail.id as Language);
              },
              items: [
                {
                  id: 'da',
                  text: 'دری (DA — RTL)',
                },
                {
                  id: 'ps',
                  text: 'پښتو (PS — RTL)',
                },
                {
                  id: 'en',
                  text: 'English (EN — LTR)',
                },
              ],
            },
            {
              type: 'button',
              text: density === Density.Compact ? '⚡ Compact' : '📐 Standard',
              onClick: toggleDensity,
              ariaLabel: t.nav.accountSettings,
            },
            {
              type: 'button',
              text: mode === Mode.Dark ? '🌙 Dark' : '☀️ Light',
              onClick: toggleMode,
              ariaLabel: t.nav.notifications,
            },
            {
              type: 'menu-dropdown',
              text: 'kabul-saffron.ariacloudservices.org',
              description: t.aiStudio.tierBadge,
              iconName: 'user-profile',
              items: [
                {
                  id: 'settings',
                  text: t.nav.accountSettings,
                },
                {
                  id: 'notifications',
                  text: t.nav.notifications,
                },
                {
                  id: 'signout',
                  text: t.nav.signOut,
                },
              ],
            },
          ]}
          i18nStrings={{
            searchIconAriaLabel: t.nav.searchPlaceholder,
            searchDismissIconAriaLabel: t.common.cancel,
            overflowMenuTriggerText: t.nav.accountSettings,
            overflowMenuTitleText: t.appTitle,
            overflowMenuBackIconAriaLabel: t.common.cancel,
            overflowMenuDismissIconAriaLabel: t.common.cancel,
          }}
        />
      </div>

      <AppLayout
        headerSelector="#aria-cloudscape-top-nav"
        navigationOpen={navigationOpen}
        onNavigationChange={({ detail }) => setNavigationOpen(detail.open)}
        navigationWidth={290}
        navigation={
          <SideNavigation
            activeHref={activeNavHref === '/' ? '/dashboard' : activeNavHref}
            header={{
              href: '/dashboard',
              text: t.appTitle,
            }}
            onFollow={(event) => {
              if (!event.detail.external) {
                event.preventDefault();
                setActiveNavHref(event.detail.href);
                router.push(event.detail.href);
              }
            }}
            items={sideNavItems}
          />
        }
        breadcrumbs={
          <BreadcrumbGroup
            items={[
              { text: t.appTitle, href: '/dashboard' },
              { text: currentBreadcrumbText, href: activeNavHref },
            ]}
            onFollow={(event) => {
              event.preventDefault();
              setActiveNavHref(event.detail.href);
              router.push(event.detail.href);
            }}
            ariaLabel={t.appTitle}
          />
        }
        toolsOpen={toolsOpen}
        onToolsChange={({ detail }) => setToolsOpen(detail.open)}
        tools={
          <HelpPanel header={<h2>{t.infra.headerTitle}</h2>}>
            <SpaceBetween size="m">
              <Box variant="p">{t.infra.headerDesc}</Box>
              <Box variant="p">{t.aiStudio.architectureNote}</Box>
              <Box variant="p">{t.billing.cardDesc}</Box>
            </SpaceBetween>
          </HelpPanel>
        }
        content={children}
      />
    </div>
  );
}
