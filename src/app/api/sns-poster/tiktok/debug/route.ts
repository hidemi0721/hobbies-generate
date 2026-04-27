import { NextRequest, NextResponse } from "next/server";
import { getOrigin } from "@/lib/getOrigin";

const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY ?? "";

/** TikTok に送っている認証 URL をそのまま返す（デバッグ用） */
export async function GET(req: NextRequest) {
  const origin      = getOrigin(req);
  const redirectUri = `${origin}/api/sns-poster/tiktok/callback`;

  const params = new URLSearchParams({
    client_key: CLIENT_KEY,
    scope: "video.upload",
    response_type: "code",
    redirect_uri: redirectUri,
    state: "debug_state",
  });

  return NextResponse.json({
    client_key: CLIENT_KEY ? CLIENT_KEY.slice(0, 4) + "****" : "(未設定)",
    redirect_uri: redirectUri,
    scope: "video.upload",
    auth_url: `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`,
  });
}
