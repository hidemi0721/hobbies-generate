import { NextRequest, NextResponse } from "next/server";
import { getOrigin } from "@/lib/getOrigin";

export async function POST(req: NextRequest) {
  const { igUserId } = await req.json() as { igUserId: string };

  if (!igUserId || !/^\d+$/.test(igUserId)) {
    return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
  }

  const origin = getOrigin(req);
  const response = NextResponse.json({ ok: true });
  response.cookies.set("sns_ig_user_id", igUserId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 60,
    path: "/",
  });
  return response;
}
