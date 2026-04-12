import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { artist, song } = await req.json();
    if (!artist && !song) {
      return NextResponse.json({ error: "artist または song が必要です" }, { status: 400 });
    }

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `You are a Suno AI music prompt expert. Suggest keywords for recreating the style of this music in Suno AI.

Artist: ${artist || "(not specified)"}
Song: ${song || "(not specified)"}

Return ONLY valid JSON with exactly these 5 keys. Each value is an array of 4 concise English keywords/phrases suitable for Suno AI prompts:

{
  "Genre Fusion": [],
  "Instrumentation": [],
  "Atmosphere / Texture": [],
  "Rhythm / BPM": [],
  "Vocal Style": []
}`,
        },
      ],
    });

    const raw = (msg.content[0] as { type: string; text: string }).text.trim();
    // JSON部分だけ抽出
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSONの解析に失敗しました");

    const data = JSON.parse(jsonMatch[0]);
    return NextResponse.json(data);
  } catch (e) {
    console.error("[prompt-suggest]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
