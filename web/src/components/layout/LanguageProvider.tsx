'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { copy } from '@/lib/i18n';
import type { Language } from '@/lib/types';

type LanguageContextValue = Readonly<{
  language: Language;
  setLanguage: (language: Language) => void;
  t: typeof copy.zh | typeof copy.en;
}>;

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [language, setLanguageState] = useState<Language>('zh');

  useEffect(() => {
    const saved = window.localStorage.getItem('aics_language');
    if (saved === 'zh' || saved === 'en') setLanguageState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  }, [language]);

  const setLanguage = (nextLanguage: Language) => {
    window.localStorage.setItem('aics_language', nextLanguage);
    setLanguageState(nextLanguage);
  };

  const value = useMemo(() => ({ language, setLanguage, t: copy[language] }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('useLanguage must be used inside LanguageProvider');
  return value;
}
