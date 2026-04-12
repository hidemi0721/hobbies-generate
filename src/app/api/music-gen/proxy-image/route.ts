import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/auth";

/**
 * GET /api/music-gen/proxy-image?url=<encoded>
 * COEP 環境ではブラウザから直接 fetch した外部画像が CORP ヘッダー不足でブロックされるため、
 * サーバー側でプロキシして返す。
 */
export async function GET(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url is required" }, { status: 400 });

  // 許可するホスト（DALL-E / Supabase 等）
  const allowed = [
    "oaidalleapiprodscus.blob.core.windows.net",
    ".supabase.co",
  ];
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }
  if (!allowed.some(h => host.endsWith(h))) {
    return NextResponse.json({ error: "host not allowed" }, { status: 403 });
  }

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) {
      return NextResponse.json({ error: `upstream ${upstream.status}` }, { status: 502 });
    }
    const buffer = await upstream.arrayBuffer();
    const contentType = upstream.headers.get("content-type") ?? "image/png";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
        // COEP 環境下でブラウザがこのレスポンスを使えるよう明示
        "Cross-Origin-Resource-Policy": "cross-origin",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
