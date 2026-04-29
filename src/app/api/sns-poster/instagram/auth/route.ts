import { NextRequest, NextResponse } from "next/server";
import { getOrigin } from "@/lib/getOrigin";

const CLIENT_ID = process.env.INSTAGRAM_CLIENT_ID ?? "";
const SCOPES = "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement";

export async function GET(req: NextRequest) {
  if (!CLIENT_ID) {
    return NextResponse.json(
      { error: "INSTAGRAM_CLIENT_ID が未設定です。Vercel の環境変数を確認してください。" },
      { status: 500 }
    );
  }
  const redirectUri = `${getOrigin(req)}/api/sns-poster/instagram/callback`;
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    scope: SCOPES,
    response_type: "code",
  });
  return NextResponse.redirect(
    `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`
  );
}
