import { cookies } from "next/headers";
import Landing from "@/components/landing/landing";
import { getLang } from "@/lib/i18n/messages";

export default async function HomePage() {
  const cookieStore = await cookies();
  const lang = getLang(cookieStore.get("rabto_lang")?.value);
  return <Landing lang={lang} />;
}
