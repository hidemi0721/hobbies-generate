import { NextRequest, NextResponse } from "next/server";
import { getOrigin } from "@/lib/getOrigin";

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  return NextResponse.json({
    origin,
    nextUrlOrigin: req.nextUrl.origin,
    host: req.headers.get("host"),
    xForwardedHost: req.headers.get("x-forwarded-host"),
    xForwardedProto: req.headers.get("x-forwarded-proto"),
    redirectUri: `${origin}/api/sns-poster/youtube/callback`,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "(未設定)",
  });
}
