'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  applyMode,
  applyDensity,
  Mode,
  Density,
} from '@cloudscape-design/global-styles';
import * as awsui from '@cloudscape-design/design-tokens';
import {
  Language,
  TranslationDictionary,
  useTranslation,
} from '@aria-cloud/ui';

export interface CloudscapeThemeContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationDictionary;
  dir: 'ltr' | 'rtl';
  isRtl: boolean;
  mode: Mode;
  toggleMode: () => void;
  density: Density;
  toggleDensity: () => void;
  activeNavHref: string;
  setActiveNavHref: (href: string) => void;
  tokens: typeof awsui;
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
  const [mode, setMode] = useState<Mode>(Mode.Dark);
  const [density, setDensity] = useState<Density>(Density.Compact);
  const [activeNavHref, setActiveNavHref] = useState<string>('/dashboard');

  useEffect(() => {
    applyMode(mode);
    applyDensity(density);
  }, [mode, density]);

  const toggleMode = () => {
    setMode((prev) => (prev === Mode.Dark ? Mode.Light : Mode.Dark));
  };

  const toggleDensity = () => {
    setDensity((prev) =>
      prev === Density.Compact ? Density.Comfortable : Density.Compact
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
        tokens: awsui,
      }}
    >
      {children}
    </CloudscapeThemeContext.Provider>
  );
}

export function useCloudscapeTheme(): CloudscapeThemeContextValue {
  const ctx = useContext(CloudscapeThemeContext);
  if (!ctx) {
    throw new Error(
      'useCloudscapeTheme must be used within a CloudscapeThemeProvider'
    );
  }
  return ctx;
}
