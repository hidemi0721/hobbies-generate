import { NextRequest, NextResponse } from "next/server";

/** 各プラットフォームのセッション有無を返す */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    youtube:   !!req.cookies.get("sns_yt_access_token")?.value,
    instagram: !!req.cookies.get("sns_ig_access_token")?.value,
    tiktok:    !!req.cookies.get("sns_tt_access_token")?.value,
  });
}
