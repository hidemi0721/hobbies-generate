import { NextRequest, NextResponse } from "next/server";

const CLIENT_ID     = process.env.YOUTUBE_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET ?? "";
const REDIRECT_URI  = `${process.env.NEXT_PUBLIC_APP_URL}/api/music-gen/youtube/callback`;

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/music-gen?youtube_error=no_code`);
  }

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await res.json();
    if (!tokens.access_token) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/music-gen?youtube_error=token_failed`);
    }

    // アクセストークンを httpOnly クッキーに保存（1時間）
    const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/music-gen?youtube_connected=1`);
    response.cookies.set("yt_access_token", tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 3600,
      path: "/",
    });
    if (tokens.refresh_token) {
      response.cookies.set("yt_refresh_token", tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });
    }
    return response;
  } catch (e) {
    console.error("[youtube/callback]", e);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/music-gen?youtube_error=exception`);
  }
}
