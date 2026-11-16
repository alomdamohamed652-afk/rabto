import { Suspense } from "react";
import InvitationContent from "./invitation-content";

export default function AcceptInvitationPage() {
  return <Suspense fallback={<main className="auth-shell"><p>جارٍ تحميل الدعوة...</p></main>}><InvitationContent /></Suspense>;
}
