import { NextRequest, NextResponse } from "next/server";

/** 指定プラットフォームのセッションを削除 */
export async function POST(req: NextRequest) {
  const { platform } = await req.json() as { platform: string };
  const response = NextResponse.json({ ok: true });

  if (platform === "youtube") {
    response.cookies.delete("sns_yt_access_token");
    response.cookies.delete("sns_yt_refresh_token");
  } else if (platform === "instagram") {
    response.cookies.delete("sns_ig_access_token");
    response.cookies.delete("sns_ig_user_id");
  } else if (platform === "tiktok") {
    response.cookies.delete("sns_tt_access_token");
    response.cookies.delete("sns_tt_refresh_token");
  }

  return response;
}
