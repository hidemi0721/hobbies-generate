import { NextRequest, NextResponse } from "next/server";

async function computeToken(password: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("hobbies-generate-session"));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function isAuthenticated(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get("auth_token")?.value;
  if (!token) return false;
  const password = process.env.AUTH_PASSWORD;
  if (!password) return false;
  const expected = await computeToken(password);
  return token === expected;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // TikTok ドメイン確認ファイル
  if (pathname === "/tiktokvLERmJJjhkEEDhCXlxBFbaapnLEqRCVf.txt") {
    return new NextResponse("tiktok-developers-site-verification=vLERmJJjhkEEDhCXlxBFbaapnLEqRCVf", {
      headers: { "Content-Type": "text/plain" },
    });
  }

  if (
    pathname === "/login" ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/cron/") ||
    pathname === "/terms" ||
    pathname === "/privacy"
  ) {
    return NextResponse.next();
  }

  if (!(await isAuthenticated(req))) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
