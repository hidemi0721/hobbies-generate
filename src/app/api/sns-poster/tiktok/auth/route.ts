import { NextRequest, NextResponse } from "next/server";
import { getOrigin } from "@/lib/getOrigin";
import crypto from "crypto";

const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY ?? "";
const SCOPES     = "video.publish,video.upload";

export async function GET(req: NextRequest) {
  if (!CLIENT_KEY) {
    return NextResponse.json({ error: "TIKTOK_CLIENT_KEY が未設定です" }, { status: 500 });
  }

  const origin      = getOrigin(req);
  const redirectUri = `${origin}/api/sns-poster/tiktok/callback`;
  const csrfState   = crypto.randomBytes(16).toString("hex");

  const params = new URLSearchParams({
    client_key: CLIENT_KEY,
    scope: SCOPES,
    response_type: "code",
    redirect_uri: redirectUri,
    state: csrfState,
  });

  const response = NextResponse.redirect(
    `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`
  );
  response.cookies.set("tt_csrf", csrfState, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
