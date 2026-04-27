import { NextRequest, NextResponse } from "next/server";
import { getOrigin } from "@/lib/getOrigin";

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID ?? "";
const SCOPES    = "https://www.googleapis.com/auth/youtube.upload";

export async function GET(req: NextRequest) {
  if (!CLIENT_ID) {
    return NextResponse.json({ error: "YOUTUBE_CLIENT_ID が未設定です" }, { status: 500 });
  }

  const origin      = getOrigin(req);
  const redirectUri = `${origin}/api/sns-poster/youtube/callback`;

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
  });
  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
