import { createClerkClient } from "@clerk/backend";
import { NextResponse } from "next/server";

type ShopIdentity = {
  source: "clerk" | "local" | "sites";
  userId: string;
};

function allowedEmails() {
  return new Set(
    (process.env.SHOP_ADMIN_EMAILS ?? "harikiran.dev.schooldb@gmail.com")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function authorizeShopRequest(
  request: Request,
): Promise<ShopIdentity | NextResponse> {
  const sitesUserId = request.headers.get("oai-authenticated-user-id")?.trim();
  if (sitesUserId) {
    return { source: "sites", userId: sitesUserId };
  }

  const requestHost = new URL(request.url).hostname;
  if (
    process.env.NODE_ENV !== "production" &&
    (requestHost === "localhost" || requestHost === "127.0.0.1") &&
    !request.headers.has("authorization")
  ) {
    return { source: "local", userId: "local-development" };
  }

  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  if (!secretKey || !publishableKey) {
    console.error("Clerk server credentials are not configured.");
    return NextResponse.json({ error: "Shop authentication is unavailable." }, { status: 503 });
  }

  try {
    const clerk = createClerkClient({ secretKey, publishableKey });
    const requestState = await clerk.authenticateRequest(request, {
      acceptsToken: "session_token",
    });
    if (!requestState.isAuthenticated) {
      return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    }

    const { userId } = requestState.toAuth();
    const user = await clerk.users.getUser(userId);
    const permitted = user.emailAddresses.some((entry) =>
      allowedEmails().has(entry.emailAddress.toLowerCase()),
    );
    if (!permitted) {
      return NextResponse.json(
        { error: "This account is not authorised for the shop." },
        { status: 403 },
      );
    }
    return { source: "clerk", userId };
  } catch (error) {
    console.error("Could not authenticate shop request", error);
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }
}
