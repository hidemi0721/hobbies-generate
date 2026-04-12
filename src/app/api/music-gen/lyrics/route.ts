import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { theme, genre, language = "Japanese" } = await req.json();
    if (!theme || !genre) return NextResponse.json({ error: "theme と genre は必須です" }, { status: 400 });

    const res = await claude.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content:
          `あなたはプロの作詞家・音楽プロデューサーです。以下の条件で楽曲情報を生成してください。\n\n` +
          `テーマ: ${theme}\nジャンル: ${genre}\n言語: ${language}\n\n` +
          `以下のJSON形式のみ返してください（説明不要）:\n` +
          `{\n` +
          `  "title": "曲タイトル",\n` +
          `  "lyrics": "歌詞（[Verse]、[Chorus]などSuno AI形式のセクションタグを含む）",\n` +
          `  "style_prompt": "Suno AIのmusic style欄に入れる英語プロンプト（例: upbeat kawaii future bass, female vocal, dreamy synth）",\n` +
          `  "image_prompt": "DALL-E 3用ジャケット画像プロンプト（英語、詳細に）",\n` +
          `  "description": "YouTube動画説明文（日本語200文字以内）"\n` +
          `}`,
      }],
    });

    const raw = res.content[0].type === "text" ? res.content[0].text : "{}";
    const data = JSON.parse(raw.replace(/```json|```/g, "").trim());
    return NextResponse.json(data);
  } catch (e) {
    console.error("[music-gen/lyrics]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
