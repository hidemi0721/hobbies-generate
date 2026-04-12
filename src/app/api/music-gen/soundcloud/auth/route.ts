import { NextResponse } from "next/server";

const CLIENT_ID    = process.env.SOUNDCLOUD_CLIENT_ID ?? "";
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/music-gen/soundcloud/callback`;

export async function GET() {
  if (!CLIENT_ID) {
    return NextResponse.json(
      { error: "SOUNDCLOUD_CLIENT_ID が未設定です。.env.local を確認してください。" },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "non-expiring",
  });

  return NextResponse.redirect(
    `https://soundcloud.com/connect?${params.toString()}`
  );
}
