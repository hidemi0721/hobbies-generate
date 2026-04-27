import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/** Supabase への署名付きアップロード URL を発行する */
export async function POST(req: NextRequest) {
  const { filename, contentType } = await req.json() as {
    filename: string;
    contentType: string;
  };

  if (!filename) {
    return NextResponse.json({ error: "filename が必要です" }, { status: 400 });
  }

  const ext        = filename.split(".").pop()?.toLowerCase() ?? "mp4";
  const path       = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const supabase   = getSupabase();

  const { data, error } = await supabase.storage
    .from("sns-temp")
    .createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "URL 生成失敗" }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from("sns-temp").getPublicUrl(path);

  return NextResponse.json({
    signedUrl: data.signedUrl,
    path,
    publicUrl: urlData.publicUrl,
    token: data.token,
  });
}
