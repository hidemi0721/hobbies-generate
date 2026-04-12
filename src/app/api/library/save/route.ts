import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/auth";

export const maxRequestBodySize = "20mb";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = "library";

async function uploadDataUrl(dataUrl: string, path: string): Promise<string> {
  const [header, b64] = dataUrl.split(",");
  const mime = header.match(/data:([^;]+);/)?.[1] ?? "image/png";
  const buf  = Buffer.from(b64, "base64");
  const { error } = await supabase.storage.from(BUCKET).upload(path, buf, { contentType: mime, upsert: false });
  if (error) throw new Error(error.message);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

async function fetchAndUpload(url: string, path: string): Promise<string> {
  // data URL
  if (url.startsWith("data:")) return uploadDataUrl(url, path);
  // 通常 URL（DALL-E CDN など）はそのまま利用
  return url;
}

export async function POST(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  try {
    const { tool, title, imageUrl, extraUrls = [], metadata = {} } = await req.json();

    if (!tool || !imageUrl) {
      return NextResponse.json({ error: "tool と imageUrl が必要です" }, { status: 400 });
    }

    const ts = Date.now();

    // メイン画像をアップロード（data URL の場合）
    const persistedMain = await fetchAndUpload(imageUrl, `${tool}/${ts}-main.png`);

    // サブ画像
    const persistedExtra = await Promise.all(
      (extraUrls as string[]).map((u: string, i: number) =>
        fetchAndUpload(u, `${tool}/${ts}-${i}.png`)
      )
    );

    const { data, error } = await supabase
      .from("library_items")
      .insert({
        tool,
        title: title ?? "",
        image_url:  persistedMain,
        extra_urls: persistedExtra,
        metadata,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, item: data });
  } catch (e) {
    console.error("[library/save]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
