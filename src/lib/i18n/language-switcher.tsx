"use client";

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { t, type Language } from "./messages";

type LanguageContextValue = {
  lang: Language;
  setLang: (language: Language) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ initialLanguage, children }: { initialLanguage: Language; children: ReactNode }) {
  const [lang, setLang] = useState<Language>(initialLanguage);
  return <LanguageContext.Provider value={{ lang, setLang }}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): Language {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context.lang;
}

export default function LanguageSwitcher({ lang }: { lang: Language }) {
  const router = useRouter();
  const context = useContext(LanguageContext);

  function switchLanguage() {
    const nextLanguage: Language = lang === "ar" ? "en" : "ar";
    document.cookie = `rabto_lang=${nextLanguage}; Path=/; Max-Age=31536000; SameSite=Lax`;
    document.documentElement.lang = nextLanguage;
    document.documentElement.dir = nextLanguage === "ar" ? "rtl" : "ltr";
    context?.setLang(nextLanguage);
    router.refresh();
  }

  return (
    <button
      className="language-switcher"
      type="button"
      onClick={switchLanguage}
      aria-label={t(lang, "language")}
    >
      {t(lang, "switchLanguage")}
    </button>
  );
}
