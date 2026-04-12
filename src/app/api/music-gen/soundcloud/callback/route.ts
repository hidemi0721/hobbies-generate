import { NextRequest, NextResponse } from "next/server";

const CLIENT_ID     = process.env.SOUNDCLOUD_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.SOUNDCLOUD_CLIENT_SECRET ?? "";
const REDIRECT_URI  = `${process.env.NEXT_PUBLIC_APP_URL}/api/music-gen/soundcloud/callback`;

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/music-gen?sc_error=no_code`
    );
  }

  try {
    const res = await fetch("https://api.soundcloud.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        code,
      }),
    });

    const tokens = await res.json();
    if (!tokens.access_token) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/music-gen?sc_error=token_failed`
      );
    }

    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/music-gen?sc_connected=1`
    );
    response.cookies.set("sc_access_token", tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      // non-expiring トークンは 1 年で更新
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
    return response;
  } catch (e) {
    console.error("[soundcloud/callback]", e);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/music-gen?sc_error=exception`
    );
  }
}
