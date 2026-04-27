import { NextRequest, NextResponse } from "next/server";
import { getOrigin } from "@/lib/getOrigin";

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  return NextResponse.json({
    origin,
    youtubeCallbackUri: `${origin}/api/sns-poster/youtube/callback`,
    tiktokCallbackUri:  `${origin}/api/sns-poster/tiktok/callback`,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "(未設定)",
  });
}
