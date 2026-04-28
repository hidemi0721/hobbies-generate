import { NextResponse } from "next/server";

export async function GET() {
  return new NextResponse("tiktok-developers-site-verification=vLERmJJjhkEEDhCXlxBFbaapnLEqRCVf", {
    headers: { "Content-Type": "text/plain" },
  });
}
