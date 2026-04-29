import { NextRequest, NextResponse } from "next/server";
import { getOrigin } from "@/lib/getOrigin";

const CLIENT_ID = process.env.INSTAGRAM_CLIENT_ID ?? "";

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  const redirectUri = `${origin}/api/sns-poster/instagram/callback`;

  return NextResponse.json({
    client_id: CLIENT_ID ? CLIENT_ID.slice(0, 4) + "****" : "(未設定)",
    redirect_uri: redirectUri,
    scope: "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement",
  });
}
