"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLang, type Language } from "./messages";

export function useLanguage(): Language {
  const [lang, setLang] = useState<Language>("ar");

  useEffect(() => {
    const syncLanguage = () => setLang(getLang(document.cookie));
    syncLanguage();
    window.addEventListener("rabto-language-change", syncLanguage);
    return () => window.removeEventListener("rabto-language-change", syncLanguage);
  }, []);

  return lang;
}

export default function LanguageSwitcher({ lang }: { lang: Language }) {
  const router = useRouter();

  function switchLanguage() {
    const nextLanguage: Language = lang === "ar" ? "en" : "ar";
    document.cookie = `rabto_lang=${nextLanguage}; Path=/; Max-Age=31536000; SameSite=Lax`;
    window.dispatchEvent(new Event("rabto-language-change"));
    router.refresh();
  }

  return (
    <button
      className="language-switcher"
      type="button"
      onClick={switchLanguage}
      aria-label={lang === "ar" ? "Switch language to English" : "تغيير اللغة إلى العربية"}
    >
      {lang === "ar" ? "English" : "العربية"}
    </button>
  );
}
