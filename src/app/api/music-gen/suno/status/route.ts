import { NextRequest, NextResponse } from "next/server";

const SUNO_API_BASE = process.env.SUNO_API_BASE ?? "https://api.302.ai/suno/v1";
const SUNO_API_KEY  = process.env.SUNO_API_KEY ?? "";

export async function GET(req: NextRequest) {
  try {
    const task_id = req.nextUrl.searchParams.get("task_id");
    if (!task_id) return NextResponse.json({ error: "task_id が必要です" }, { status: 400 });

    // スタブ対応
    if (task_id.startsWith("stub_")) {
      return NextResponse.json({
        status: "stub",
        message: "SUNO_API_KEY 設定後に実際の楽曲が生成されます",
      });
    }

    const res = await fetch(`${SUNO_API_BASE}/feed/${task_id}`, {
      headers: { Authorization: `Bearer ${SUNO_API_KEY}` },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Suno API エラー: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    const items = Array.isArray(data) ? data : [data];
    const item = items[0];

    if (!item) return NextResponse.json({ status: "pending" });

    const status = item.status ?? "pending";
    const audio_url = item.audio_url ?? item.mp3_url ?? null;

    return NextResponse.json({ status, audio_url, raw: item });
  } catch (e) {
    console.error("[music-gen/suno/status]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
