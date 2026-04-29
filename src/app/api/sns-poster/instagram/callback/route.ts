import { NextRequest, NextResponse } from "next/server";
import { getOrigin } from "@/lib/getOrigin";

const CLIENT_ID     = process.env.INSTAGRAM_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.INSTAGRAM_CLIENT_SECRET ?? "";

export async function GET(req: NextRequest) {
  const origin      = getOrigin(req);
  const redirectUri = `${origin}/api/sns-poster/instagram/callback`;
  const appUrl      = origin;

  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(`${appUrl}/sns-poster?ig_error=no_code`);
  }

  try {
    // Step 1: 短期アクセストークン取得
    const tokenRes = await fetch("https://graph.facebook.com/v21.0/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: redirectUri,
        code,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return NextResponse.redirect(`${appUrl}/sns-poster?ig_error=token_failed`);
    }

    // Step 2: 長期トークンに交換（60日間有効）
    const llRes = await fetch(
      "https://graph.facebook.com/v21.0/oauth/access_token?" +
        new URLSearchParams({
          grant_type: "fb_exchange_token",
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          fb_exchange_token: tokenData.access_token,
        }).toString()
    );
    const llData = await llRes.json();
    const longToken: string = llData.access_token ?? tokenData.access_token;

    // Step 3: Instagram Business Account ID を自動取得
    // 前提: Facebook Page に Instagram Business/Creator アカウントが紐付いていること
    let igUserId = "";
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?access_token=${longToken}`
    );
    const pagesData = await pagesRes.json();
    const pages: Array<{ id: string; access_token?: string }> = pagesData.data ?? [];

    for (const page of pages) {
      const pageToken = page.access_token ?? longToken;
      const igRes = await fetch(
        `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${pageToken}`
      );
      const igData = await igRes.json();
      if (igData.instagram_business_account?.id) {
        igUserId = igData.instagram_business_account.id;
        break;
      }
    }

    const response = NextResponse.redirect(
      `${appUrl}/sns-poster?ig_connected=1${igUserId ? "" : "&ig_warn=no_ig_account"}`
    );
    response.cookies.set("sns_ig_access_token", longToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 60, // 60日
      path: "/",
    });
    if (igUserId) {
      response.cookies.set("sns_ig_user_id", igUserId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 60,
        path: "/",
      });
    }
    return response;
  } catch (e) {
    console.error("[sns-poster/instagram/callback]", e);
    return NextResponse.redirect(`${appUrl}/sns-poster?ig_error=exception`);
  }
}
