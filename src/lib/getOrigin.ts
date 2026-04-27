import { NextRequest } from "next/server";

/**
 * リクエストの公開オリジンを取得する。
 * Vercel 等のリバースプロキシ環境では x-forwarded-* ヘッダーを優先する。
 */
export function getOrigin(req: NextRequest): string {
  // 環境変数で明示されている場合は最優先
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  // Vercel / リバースプロキシが付与するヘッダーを使う
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host  = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3001";

  return `${proto}://${host}`;
}
