import { NextResponse } from "next/server";
import { readSessionCookie } from "@/lib/auth";
import { requirePlatformAdmin } from "@/lib/access-control";
import { provisionProductBatch } from "@/lib/provisioning";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const actorUserId = readSessionCookie(request.headers.get("cookie"));
    if (!actorUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await requirePlatformAdmin(actorUserId);
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.workspaceId !== "string" || typeof body.productTypeId !== "string" ||
        typeof body.batchCode !== "string" || typeof body.quantity !== "number" ||
        typeof body.initialDestinationUrl !== "string") {
      return NextResponse.json({ error: "All batch fields are required." }, { status: 400 });
    }
    const result = await provisionProductBatch({
      actorUserId,
      workspaceId: body.workspaceId,
      productTypeId: body.productTypeId,
      batchCode: body.batchCode,
      quantity: body.quantity,
      initialDestinationUrl: body.initialDestinationUrl,
      changeReason: typeof body.changeReason === "string" ? body.changeReason : undefined,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to provision batch.";
    const status = /required|must be|not found|not belong|administrator access/.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
