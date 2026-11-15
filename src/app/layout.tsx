import type { Metadata, Viewport } from "next";
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}