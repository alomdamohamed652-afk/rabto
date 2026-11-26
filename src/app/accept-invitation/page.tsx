import { Suspense } from "react";
import { cookies } from "next/headers";
import InvitationContent from "./invitation-content";
import { getLang, t } from "@/lib/i18n/messages";

export default async function AcceptInvitationPage() {
  const cookieStore = await cookies();
  const lang = getLang(cookieStore.get("rabto_lang")?.value);
  return (
    <Suspense fallback={<main className="auth-shell"><p>{t(lang, "invitationLoading")}</p></main>}>
      <InvitationContent />
    </Suspense>
  );
}
