import { NextRequest, NextResponse } from "next/server";

const SUNO_API_BASE = process.env.SUNO_API_BASE ?? "https://api.302.ai/suno/v1";
const SUNO_API_KEY  = process.env.SUNO_API_KEY ?? "";

export async function POST(req: NextRequest) {
  try {
    const { lyrics, style_prompt, title, persona_id } = await req.json();

    // APIキー未設定時はスタブ
    if (!SUNO_API_KEY) {
      return NextResponse.json({
        task_id: "stub_" + Date.now(),
        stub: true,
        message: "SUNO_API_KEY が未設定です。.env.local に追加してください。",
      });
    }

    const payload: Record<string, string> = {
      prompt: lyrics,
      style: style_prompt,
      title,
      make_instrumental: "false",
    };
    if (persona_id || process.env.SUNO_PERSONA_ID) {
      payload.persona_id = persona_id || process.env.SUNO_PERSONA_ID!;
    }

    const res = await fetch(`${SUNO_API_BASE}/generate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUNO_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Suno API エラー: ${err}` }, { status: res.status });
    }

    const data = await res.json();
    const task_id = data.id ?? data.task_id;
    return NextResponse.json({ task_id });
  } catch (e) {
    console.error("[music-gen/suno/start]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
