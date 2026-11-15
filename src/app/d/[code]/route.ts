import { and, eq, ne, isNotNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { linkDestinations, productCodes, products } from "@/db/schema";

const CODE_PATTERN = /^[A-Za-z0-9_-]{6,32}$/;

function unavailable() {
  return new NextResponse("This RABTO link is unavailable.", {
    status: 404,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow"
    }
  });
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;

  if (!CODE_PATTERN.test(code)) return unavailable();

  try {
    const db = getDb();
    const [record] = await db
      .select({ destination: linkDestinations.currentUrl })
      .from(productCodes)
      .innerJoin(products, eq(products.id, productCodes.productId))
      .innerJoin(linkDestinations, eq(linkDestinations.productCodeId, productCodes.id))
      .where(and(
        eq(productCodes.publicCode, code),
        isNotNull(productCodes.activatedAt),
        ne(products.status, "archived")
      ))
      .limit(1);

    if (!record) return unavailable();

    let destination: URL;
    try {
      destination = new URL(record.destination);
    } catch {
      return new NextResponse("This RABTO destination is invalid.", {
        status: 410,
        headers: { "Cache-Control": "no-store, max-age=0" }
      });
    }

    if (destination.protocol !== "https:" && destination.protocol !== "http:") {
      return new NextResponse("This RABTO destination is not allowed.", {
        status: 410,
        headers: { "Cache-Control": "no-store, max-age=0" }
      });
    }

    return NextResponse.redirect(destination, {
      status: 302,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Referrer-Policy": "no-referrer",
        "X-Robots-Tag": "noindex, nofollow"
      }
    });
  } catch (error) {
    console.error("RABTO resolver lookup failed", error);
    return new NextResponse("RABTO is temporarily unavailable.", {
      status: 503,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Retry-After": "30"
      }
    });
  }
}
