import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AcceptInvitationForm from "./accept-invitation-form";

export default function AcceptInvitationPage() {
  return <Suspense fallback={<main className="auth-shell"><p>جارٍ تحميل الدعوة...</p></main>}><InvitationContent /></Suspense>;
}

function InvitationContent() {
  const params = useSearchParams();
  return <AcceptInvitationForm token={params.get("token") || ""} />;
}
