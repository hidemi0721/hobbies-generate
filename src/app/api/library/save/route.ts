import { getSupabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/auth";

export const maxRequestBodySize = "20mb";
export const maxDuration = 60;

const BUCKET = "library";

async function uploadDataUrl(dataUrl: string, path: string): Promise<string> {
  const [header, b64] = dataUrl.split(",");
  const mime = header.match(/data:([^;]+);/)?.[1] ?? "image/png";
  const buf  = Buffer.from(b64, "base64");
  const { error } = await getSupabase().storage.from(BUCKET).upload(path, buf, { contentType: mime, upsert: false });
  if (error) throw new Error(error.message);
  return getSupabase().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** sns-temp などの URL からバイナリを取得して library バケットにアップロード */
async function fetchUrlAndUpload(url: string, path: string, contentType: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed: ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const { error } = await getSupabase().storage.from(BUCKET).upload(path, buf, { contentType, upsert: false });
  if (error) throw new Error(error.message);
  return getSupabase().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

async function fetchAndUpload(url: string, path: string, forceUpload = false): Promise<string> {
  if (url.startsWith("data:")) return uploadDataUrl(url, path);
  if (forceUpload) {
    // 動画など: 実際にダウンロードして library バケットに保存
    const ext = path.split(".").pop() ?? "mp4";
    const mime = ext === "mp4" ? "video/mp4" : ext === "webm" ? "video/webm" : "video/mp4";
    return fetchUrlAndUpload(url, path, mime);
  }
  // 通常 URL（DALL-E CDN など）はそのまま利用
  return url;
}

export async function POST(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  try {
    const { tool, title, imageUrl, extraUrls = [], metadata = {}, uploadVideo = false } = await req.json();

    if (!tool || !imageUrl) {
      return NextResponse.json({ error: "tool と imageUrl が必要です" }, { status: 400 });
    }

    const ts = Date.now();

    // 動画ツールは library バケットにコピー、それ以外は URL そのまま or data URL アップロード
    const isVideo = tool === "video" || uploadVideo;
    const ext = isVideo ? (imageUrl.split("?")[0].split(".").pop() ?? "mp4") : "png";
    const persistedMain = await fetchAndUpload(imageUrl, `${tool}/${ts}-main.${ext}`, isVideo);

    // サブ画像（動画には通常なし）
    const persistedExtra = await Promise.all(
      (extraUrls as string[]).map((u: string, i: number) =>
        fetchAndUpload(u, `${tool}/${ts}-${i}.png`, false)
      )
    );

    const { data, error } = await getSupabase()
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
