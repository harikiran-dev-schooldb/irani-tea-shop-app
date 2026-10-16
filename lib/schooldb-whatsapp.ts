import { NextResponse } from "next/server";

const schoolDbBaseUrl = (
  process.env.SCHOOLDB_AUTH_BASE_URL ?? "https://www.schooldb.co.in/"
).replace(/\/?$/, "/");

export const schoolDbTenant =
  process.env.SCHOOLDB_TENANT_CODE ??
  process.env.SHOP_ADMIN_SCHOOL_SLUGS?.split(",")[0]?.trim() ??
  "kotak";

export async function forwardSchoolDbAuth(
  path: "send-otp" | "verify-otp",
  payload: Record<string, unknown>,
) {
  try {
    const response = await fetch(
      `${schoolDbBaseUrl}api/v1/public/auth/${path}`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...payload, schoolSlug: schoolDbTenant }),
        cache: "no-store",
      },
    );
    const body = await response.text();
    return new NextResponse(body || JSON.stringify({ error: "Empty response" }), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("SchoolDB WhatsApp authentication failed", error);
    return NextResponse.json(
      { error: "Could not reach WhatsApp sign-in. Please try again." },
      { status: 502 },
    );
  }
}
