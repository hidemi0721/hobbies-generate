import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { refreshYouTubeToken } from "@/lib/sns-upload";

/** 予約投稿をDBに保存する */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      platform: string;
      videoUrl: string;
      supabasePath: string;
      title: string;
      caption: string;
      scheduledTime: string; // ISO 8601 UTC
    };

    const { platform, videoUrl, supabasePath, title, caption, scheduledTime } = body;

    if (!platform || !videoUrl || !scheduledTime) {
      return NextResponse.json({ error: "必須パラメーターが不足しています" }, { status: 400 });
    }

    // アクセストークンを Cookie から取得
    let accessToken = "";
    let igUserId = "";

    if (platform === "instagram") {
      accessToken = req.cookies.get("sns_ig_access_token")?.value ?? "";
      igUserId    = req.cookies.get("sns_ig_user_id")?.value ?? "";
      if (!accessToken) return NextResponse.json({ error: "Instagram 未接続" }, { status: 401 });
    } else if (platform === "tiktok") {
      accessToken = req.cookies.get("sns_tt_access_token")?.value ?? "";
      if (!accessToken) return NextResponse.json({ error: "TikTok 未接続" }, { status: 401 });
    } else {
      return NextResponse.json({ error: "未対応プラットフォーム" }, { status: 400 });
    }

    const supabase = getSupabase();
    const { error } = await supabase.from("scheduled_posts").insert({
      platform,
      video_url: videoUrl,
      supabase_path: supabasePath,
      title,
      caption,
      scheduled_time: scheduledTime,
      access_token: accessToken,
      ig_user_id: igUserId || null,
      status: "pending",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
