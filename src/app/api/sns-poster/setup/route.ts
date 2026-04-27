import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/** sns-temp バケットを作成する（初回のみ実行） */
export async function POST() {
  const supabase = getSupabase();

  const { data, error } = await supabase.storage.createBucket("sns-temp", {
    public: true,
  });

  if (error) {
    // 既に存在する場合は "already exists" エラーになる
    if (error.message.includes("already exists")) {
      return NextResponse.json({ ok: true, message: "既に存在します" });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, bucket: data });
}
