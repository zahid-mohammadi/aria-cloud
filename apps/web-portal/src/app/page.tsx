'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation, Language } from '@aria-cloud/ui';
import {
  publicTranslations,
  PublicLanguage,
  PublicTranslationSchema,
} from '../i18n/publicTranslations';
import { PublicHeader } from '../components/public/PublicHeader';
import { HeroSection } from '../components/public/HeroSection';
import { CloudServicesCatalog } from '../components/public/CloudServicesCatalog';
import { RegionalInfrastructure } from '../components/public/RegionalInfrastructure';
import { SolutionBlueprints } from '../components/public/SolutionBlueprints';
import { PricingMatrix } from '../components/public/PricingMatrix';
import { SocialCharterManifesto } from '../components/public/SocialCharterManifesto';
import { FrictionKillerFAQ } from '../components/public/FrictionKillerFAQ';
import { PublicFooter } from '../components/public/PublicFooter';

export default function HomePage() {
  const { language, setLanguage } = useTranslation();
  const [mounted, setMounted] = useState(false);

  // Safely resolve language to one of "da" | "ps" | "en"
  const resolvedLang: PublicLanguage =
    language === 'ps' ? 'ps' : language === 'en' ? 'en' : 'da';

  const t: PublicTranslationSchema = publicTranslations[resolvedLang];

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLanguageChange = (newLang: PublicLanguage) => {
    setLanguage(newLang as Language);
  };

  // Ensure document title updates for landing page
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title =
        resolvedLang === 'en'
          ? 'AriaCloud | Sovereign Cloud & Multilingual AI for Afghanistan'
          : resolvedLang === 'ps'
            ? 'آریا کلاوډ | د افغانستان لپاره خپلواک کلاوډ او مصنوعي هوښ'
            : 'آریا کلاود | زیرساخت مستقل ابری و هوش مصنوعی افغانستان';
    }
  }, [resolvedLang]);

  return (
    <div
      dir={t.dir}
      className={`public-root ${t.dir === 'rtl' ? 'font-vazir' : 'font-sans'}`}
    >
      {/* Global Header & Status Ticker */}
      <PublicHeader
        t={t}
        currentLang={resolvedLang}
        onLanguageChange={handleLanguageChange}
      />

      {/* Main Content Surfaces */}
      <main>
        {/* Enterprise Two-Column Hero with Interactive Cloud Console Showcase */}
        <HeroSection t={t} />

        {/* Enterprise-Style Tabbed Cloud Services Catalog */}
        <CloudServicesCatalog t={t} />

        {/* Regional Backbone & Domestic Edge Network (Kabul, Herat, Mazar POPs) */}
        <RegionalInfrastructure t={t} />

        {/* Enterprise Industry Blueprints (Clinics, Exporters, Universities, Merchants) */}
        <SolutionBlueprints t={t} />

        {/* Tabbed Pricing Matrix (Business vs Consumer) with Dual Currency */}
        <PricingMatrix t={t} />

        {/* 4,800 AFN Social Utility Charter Breakdown */}
        <SocialCharterManifesto t={t} />

        {/* Friction Killer FAQ Accordion */}
        <FrictionKillerFAQ t={t} />
      </main>

      {/* Public Footer */}
      <PublicFooter t={t} />
    </div>
  );
}
