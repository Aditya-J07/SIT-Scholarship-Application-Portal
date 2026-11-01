'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translations, getTranslation, TranslationDict } from '@/lib/i18n';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: TranslationDict;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
  t: translations.en,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('en');

  useEffect(() => {
    const saved = localStorage.getItem('sit_lang') as Language;
    if (saved === 'kn') {
      setLangState('kn');
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('sit_lang', newLang);
  };

  const t = getTranslation(lang);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="inline-flex border border-gray-300 text-xs font-semibold" role="group" aria-label="Language Selector">
      <button
        type="button"
        onClick={() => setLang('en')}
        className={`px-2 py-1 ${lang === 'en' ? 'bg-[#AC3D47] text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
        aria-pressed={lang === 'en'}
      >
        English
      </button>
      <button
        type="button"
        onClick={() => setLang('kn')}
        className={`px-2 py-1 ${lang === 'kn' ? 'bg-[#AC3D47] text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
        aria-pressed={lang === 'kn'}
      >
        ಕನ್ನಡ
      </button>
    </div>
  );
}
