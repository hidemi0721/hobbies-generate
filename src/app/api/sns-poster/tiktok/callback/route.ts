import { NextRequest, NextResponse } from "next/server";
import { getOrigin } from "@/lib/getOrigin";

const CLIENT_KEY    = process.env.TIKTOK_CLIENT_KEY ?? "";
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET ?? "";

export async function GET(req: NextRequest) {
  const origin      = getOrigin(req);
  const redirectUri = `${origin}/api/sns-poster/tiktok/callback`;
  const code        = req.nextUrl.searchParams.get("code");
  const state       = req.nextUrl.searchParams.get("state");
  const csrf        = req.cookies.get("tt_csrf")?.value;

  if (!code) {
    return NextResponse.redirect(`${origin}/sns-poster?tt_error=no_code`);
  }
  if (!csrf || state !== csrf) {
    return NextResponse.redirect(`${origin}/sns-poster?tt_error=csrf_mismatch`);
  }

  try {
    const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: CLIENT_KEY,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });
    const tokenData = await tokenRes.json();
    console.error("[tiktok/callback] token response:", JSON.stringify(tokenData));
    if (!tokenData.access_token) {
      const msg = encodeURIComponent(tokenData.error_description ?? tokenData.error ?? "token_failed");
      return NextResponse.redirect(`${origin}/sns-poster?tt_error=${msg}`);
    }

    const response = NextResponse.redirect(`${origin}/sns-poster?tt_connected=1`);
    response.cookies.delete("tt_csrf");
    response.cookies.set("sns_tt_access_token", tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: tokenData.expires_in ?? 86400,
      path: "/",
    });
    if (tokenData.refresh_token) {
      response.cookies.set("sns_tt_refresh_token", tokenData.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: tokenData.refresh_expires_in ?? 60 * 60 * 24 * 30,
        path: "/",
      });
    }
    return response;
  } catch (e) {
    console.error("[sns-poster/tiktok/callback]", e);
    return NextResponse.redirect(`${origin}/sns-poster?tt_error=exception`);
  }
}
