import { NextRequest, NextResponse } from "next/server";

/** 一時デバッグ用：CRON_SECRET が正しく読み込まれているか確認 v2 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET ?? "";
  const querySecret = req.nextUrl.searchParams.get("secret") ?? "";
  return NextResponse.json({
    envSet: cronSecret.length > 0,
    envLength: cronSecret.length,
    envFirst3: cronSecret.slice(0, 3),
    queryLength: querySecret.length,
    queryFirst3: querySecret.slice(0, 3),
    match: cronSecret === querySecret,
  });
}
