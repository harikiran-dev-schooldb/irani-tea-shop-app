import { NextResponse } from "next/server";

import { forwardSchoolDbAuth } from "@/lib/schooldb-whatsapp";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  if (!body || (body.action !== "VERIFY" && body.action !== "SELECT")) {
    return NextResponse.json({ error: "Invalid sign-in request." }, { status: 400 });
  }

  if (body.action === "VERIFY") {
    const phone = typeof body.phone === "string" ? body.phone.replace(/\D/g, "") : "";
    const otp = typeof body.otp === "string" ? body.otp.replace(/\D/g, "") : "";
    if (!/^[6-9]\d{9}$/.test(phone) || !/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { error: "Enter the 6-digit WhatsApp code." },
        { status: 400 },
      );
    }
    return forwardSchoolDbAuth("verify-otp", { action: "VERIFY", phone, otp });
  }

  const challengeId =
    typeof body.challengeId === "string" ? body.challengeId.trim() : "";
  const accountId = typeof body.accountId === "string" ? body.accountId.trim() : "";
  if (!challengeId || !accountId) {
    return NextResponse.json({ error: "Choose an account." }, { status: 400 });
  }
  return forwardSchoolDbAuth("verify-otp", {
    action: "SELECT",
    challengeId,
    accountId,
  });
}
