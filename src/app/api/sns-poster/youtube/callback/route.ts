import { NextRequest, NextResponse } from "next/server";
import { getOrigin } from "@/lib/getOrigin";

const CLIENT_ID     = process.env.YOUTUBE_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET ?? "";

export async function GET(req: NextRequest) {
  const origin      = getOrigin(req);
  const redirectUri = `${origin}/api/sns-poster/youtube/callback`;
  const code        = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/sns-poster?yt_error=no_code`);
  }

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokens = await res.json();
    if (!tokens.access_token) {
      return NextResponse.redirect(`${origin}/sns-poster?yt_error=token_failed`);
    }

    const response = NextResponse.redirect(`${origin}/sns-poster?yt_connected=1`);
    response.cookies.set("sns_yt_access_token", tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 3600,
      path: "/",
    });
    if (tokens.refresh_token) {
      response.cookies.set("sns_yt_refresh_token", tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });
    }
    return response;
  } catch (e) {
    console.error("[sns-poster/youtube/callback]", e);
    return NextResponse.redirect(`${origin}/sns-poster?yt_error=exception`);
  }
}
