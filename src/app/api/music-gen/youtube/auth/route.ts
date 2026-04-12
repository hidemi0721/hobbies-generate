import { NextRequest, NextResponse } from "next/server";

const CLIENT_ID     = process.env.YOUTUBE_CLIENT_ID ?? "";
const REDIRECT_URI  = `${process.env.NEXT_PUBLIC_APP_URL}/api/music-gen/youtube/callback`;
const SCOPES        = "https://www.googleapis.com/auth/youtube.upload";

export async function GET(_req: NextRequest) {
  if (!CLIENT_ID) {
    return NextResponse.json(
      { error: "YOUTUBE_CLIENT_ID が未設定です。.env.local を確認してください。" },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
