'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  Language,
  TranslationDictionary,
  useTranslation,
} from '@aria-cloud/ui';

export type ThemeMode = 'dark' | 'light';
export type ThemeDensity = 'compact' | 'comfortable';

export interface CloudscapeThemeContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationDictionary;
  dir: 'ltr' | 'rtl';
  isRtl: boolean;
  mode: ThemeMode;
  toggleMode: () => void;
  density: ThemeDensity;
  toggleDensity: () => void;
  activeNavHref: string;
  setActiveNavHref: (href: string) => void;
}

const CloudscapeThemeContext = createContext<CloudscapeThemeContextValue | null>(
  null
);

export function CloudscapeThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { language, setLanguage, t, dir, isRtl } = useTranslation();
  const [mode, setMode] = useState<ThemeMode>('dark');
  const [density, setDensity] = useState<ThemeDensity>('compact');
  const [activeNavHref, setActiveNavHref] = useState<string>('/dashboard');

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('theme-dark', 'theme-light');
      document.documentElement.classList.add(`theme-${mode}`);
      document.documentElement.setAttribute('data-theme', mode);
      document.documentElement.setAttribute('data-density', density);
    }
  }, [mode, density]);

  const toggleMode = () => {
    setMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const toggleDensity = () => {
    setDensity((prev) =>
      prev === 'compact' ? 'comfortable' : 'compact'
    );
  };

  return (
    <CloudscapeThemeContext.Provider
      value={{
        language,
        setLanguage,
        t,
        dir,
        isRtl,
        mode,
        toggleMode,
        density,
        toggleDensity,
        activeNavHref,
        setActiveNavHref,
      }}
    >
      {children}
    </CloudscapeThemeContext.Provider>
  );
}

export function useCloudscapeTheme() {
  const context = useContext(CloudscapeThemeContext);
  if (!context) {
    throw new Error(
      'useCloudscapeTheme must be used within a CloudscapeThemeProvider'
    );
  }
  return context;
}
