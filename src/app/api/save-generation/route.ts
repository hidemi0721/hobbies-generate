import { getSupabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/auth";

export const maxRequestBodySize = "50mb";


const BUCKET = "sketch-generations";

async function uploadToStorage(buf: Buffer, path: string, contentType: string): Promise<string> {
  const { error } = await getSupabase().storage
    .from(BUCKET)
    .upload(path, buf, { contentType, upsert: false });
  if (error) throw new Error(error.message);
  const { data } = getSupabase().storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function uploadDataUrl(dataUrl: string, path: string): Promise<string> {
  const [header, b64] = dataUrl.split(",");
  const mimeMatch = header.match(/data:([^;]+);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/png";
  const buf = Buffer.from(b64, "base64");
  return uploadToStorage(buf, path, mime);
}

async function uploadBase64(base64: string, mediaType: string, path: string): Promise<string> {
  const buf = Buffer.from(base64, "base64");
  return uploadToStorage(buf, path, mediaType);
}

export async function POST(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  try {
    const { prompt, imageBase64, imageMediaType, generatedUrls } = await req.json();

    const ts = Date.now();

    // オリジナル画像をSupabase Storageにアップロード（あれば）
    let originalImageUrl: string | null = null;
    if (imageBase64) {
      originalImageUrl = await uploadBase64(
        imageBase64,
        imageMediaType || "image/jpeg",
        `originals/${ts}-original.jpg`
      );
    }

    // 生成画像（data:URL or 通常URL）をSupabase Storageにアップロード
    const persistedUrls = await Promise.all(
      generatedUrls.map((url: string, i: number) => {
        if (url.startsWith("data:")) {
          return uploadDataUrl(url, `generations/${ts}-${i}.png`);
        }
        // DALL-E の通常URLはそのまま保存（期限切れリスクあり）
        return Promise.resolve(url);
      })
    );

    const { error } = await getSupabase().from("rough_generations").insert({
      original_image_url: originalImageUrl,
      prompt,
      generated_images_urls: persistedUrls,
    });

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, urls: persistedUrls });
  } catch (e) {
    console.error("[save-generation]", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
