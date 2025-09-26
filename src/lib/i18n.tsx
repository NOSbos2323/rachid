import React, { createContext, useContext, useState, ReactNode } from "react";

export type Lang = "ar" | "en";

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

const translations = {
  ar: {
    // Arabic translations
    welcome: "مرحباً",
    login: "تسجيل الدخول",
    logout: "تسجيل الخروج",
    settings: "الإعدادات",
    // Add more translations as needed
  },
  en: {
    // English translations
    welcome: "Welcome",
    login: "Login",
    logout: "Logout",
    settings: "Settings",
    // Add more translations as needed
  },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("ar");

  const t = (key: string, fallback?: string) => {
    return translations[lang][key as keyof typeof translations[typeof lang]] || fallback || key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    console.error('useI18n must be used within LanguageProvider');
    // Return a fallback context instead of throwing
    return {
      lang: 'en' as Lang,
      setLang: () => {},
      t: (key: string, fallback?: string) => fallback ?? key
    };
  }
  return ctx;
}