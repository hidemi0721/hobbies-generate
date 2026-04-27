import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  return NextResponse.json({
    origin: req.nextUrl.origin,
    host: req.headers.get("host"),
    redirectUri: `${req.nextUrl.origin}/api/sns-poster/youtube/callback`,
  });
}
