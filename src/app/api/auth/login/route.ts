import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const expected = process.env.AUTH_PASSWORD;

  if (!expected || !password) {
    return NextResponse.json({ error: "Invalid" }, { status: 401 });
  }

  let match = false;
  try {
    match = crypto.timingSafeEqual(Buffer.from(password), Buffer.from(expected));
  } catch {
    match = false;
  }

  if (!match) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = crypto
    .createHmac("sha256", expected)
    .update("hobbies-generate-session")
    .digest("hex");

  const res = NextResponse.json({ ok: true });
  res.cookies.set("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30日
    path: "/",
  });
  return res;
}
