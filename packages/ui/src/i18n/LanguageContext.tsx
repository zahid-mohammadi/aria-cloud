// packages/ui/src/i18n/LanguageContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Language, translations, TranslationDictionary } from "./translations";

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationDictionary;
  dir: "ltr" | "rtl";
  isRtl: boolean;
}

const defaultContextValue: LanguageContextType = {
  language: "da",
  setLanguage: () => {},
  t: translations["da"],
  dir: "rtl",
  isRtl: true,
};

const LanguageContext = createContext<LanguageContextType>(defaultContextValue);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("da"); // Default to Afghan Dari
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("ariacloud_lang") as Language;
    if (saved && (saved === "en" || saved === "da" || saved === "ps")) {
      setLanguageState(saved);
    }
    setMounted(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("ariacloud_lang", lang);
  };

  const t = translations[language];
  const dir = t.dir;
  const isRtl = dir === "rtl";

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dir = dir;
      document.documentElement.lang = language;
    }
  }, [dir, language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir, isRtl }}>
      <div
        dir={dir}
        className={
          isRtl
            ? "font-vazir text-start selection:bg-blue-600 selection:text-white"
            : "font-sans text-start selection:bg-blue-600 selection:text-white"
        }
      >
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  return context || defaultContextValue;
}
