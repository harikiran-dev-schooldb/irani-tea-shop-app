import { NextResponse } from "next/server";

import { forwardSchoolDbAuth } from "@/lib/schooldb-whatsapp";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    phone?: unknown;
  } | null;
  const phone = typeof body?.phone === "string" ? body.phone.replace(/\D/g, "") : "";

  if (!/^[6-9]\d{9}$/.test(phone)) {
    return NextResponse.json(
      { error: "Enter a valid 10-digit mobile number." },
      { status: 400 },
    );
  }

  return forwardSchoolDbAuth("send-otp", { phone });
}
