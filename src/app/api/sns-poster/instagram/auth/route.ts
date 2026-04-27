import { NextResponse } from "next/server";

const CLIENT_ID    = process.env.INSTAGRAM_CLIENT_ID ?? "";
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/sns-poster/instagram/callback`;
// instagram_content_publish には Business/Creator アカウント + Facebook Page 連携が必要
const SCOPES = "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement";

export async function GET() {
  if (!CLIENT_ID) {
    return NextResponse.json(
      { error: "INSTAGRAM_CLIENT_ID が未設定です。.env.local を確認してください。" },
      { status: 500 }
    );
  }
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    response_type: "code",
  });
  return NextResponse.redirect(
    `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`
  );
}
