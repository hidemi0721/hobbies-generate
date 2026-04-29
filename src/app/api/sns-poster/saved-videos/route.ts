import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/** 保存済み動画を Supabase ストレージから削除 */
export async function DELETE(req: NextRequest) {
  const { path } = await req.json() as { path: string };
  if (!path) return NextResponse.json({ error: "path が必要です" }, { status: 400 });

  const { error } = await getSupabase().storage.from("sns-temp").remove([path]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
