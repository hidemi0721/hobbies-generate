// 認証はミドルウェア（src/middleware.ts）で処理されます。
// この関数はレガシー互換のために残していますが、常に null を返します。
import { NextRequest, NextResponse } from "next/server";

export function checkAuth(_req: NextRequest): NextResponse | null {
  return null;
}
