import { NextResponse } from "next/server";
import { expiredSessionCookie } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.headers.append("Set-Cookie", expiredSessionCookie());
  return response;
}
