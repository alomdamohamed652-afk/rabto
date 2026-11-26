import { Suspense } from "react";
import InvitationContent from "./invitation-content";
import { cookies } from "next/headers";
import { getLang, t } from "@/lib/i18n/messages";

export default function AcceptInvitationPage() {
  return <Suspense fallback={<main className="auth-shell"><p>جارٍ تحميل الدعوة...</p></main>}><InvitationContent /></Suspense>;
}
