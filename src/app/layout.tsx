import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { getLang } from "@/lib/i18n/messages";
import { LanguageProvider } from "@/lib/i18n/language-switcher";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "RABTO — Connect the physical to the digital",
    template: "%s | RABTO"
  },
  description: "Manage connected products, smart links, and digital experiences with RABTO.",
  applicationName: "RABTO",
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  themeColor: "#f5f4ee",
  width: "device-width",
  initialScale: 1
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const lang = getLang(cookieStore.get("rabto_lang")?.value);

  return (
    <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"}>
      <body><LanguageProvider initialLanguage={lang}>{children}</LanguageProvider></body>
    </html>
  );
}