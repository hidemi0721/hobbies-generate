import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

export const maxRequestBodySize = "1mb";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { image_prompt, title } = await req.json();
    if (!image_prompt) return NextResponse.json({ error: "image_prompt が必要です" }, { status: 400 });

    const prompt =
      `${image_prompt} ` +
      "Music album cover art style. Square format. Visually striking, artistic. No text or typography.";

    const res = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "b64_json",
    });

    const b64 = res.data?.[0]?.b64_json;
    if (!b64) return NextResponse.json({ error: "画像生成失敗" }, { status: 500 });

    return NextResponse.json({ url: `data:image/png;base64,${b64}`, title });
  } catch (e) {
    console.error("[music-gen/image]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
