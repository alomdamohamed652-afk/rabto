"use client";

import { useSearchParams } from "next/navigation";
import AcceptInvitationForm from "./accept-invitation-form";

export default function InvitationContent() {
  const params = useSearchParams();
  return <AcceptInvitationForm token={params.get("token") || ""} />;
}
