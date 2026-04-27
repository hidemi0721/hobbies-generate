import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import {
  uploadToYouTube,
  uploadToInstagram,
  uploadToTikTok,
  refreshYouTubeToken,
  type PlatformResult,
} from "@/lib/sns-upload";

export const maxDuration = 300; // 5分（Vercel Pro 以上 / self-host 環境向け）

export async function POST(req: NextRequest) {
  try {
    const formData  = await req.formData();
    const videoFile = formData.get("video") as File | null;
    const title     = (formData.get("title") as string)?.trim() || "新しい動画";
    const caption   = (formData.get("caption") as string)?.trim() || "";
    const platforms = ((formData.get("platforms") as string) || "")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    if (!videoFile || videoFile.size === 0) {
      return NextResponse.json({ error: "動画ファイルが必要です" }, { status: 400 });
    }
    if (platforms.length === 0) {
      return NextResponse.json({ error: "投稿先を1つ以上選択してください" }, { status: 400 });
    }

    // ── Instagram は公開 URL が必要なので Supabase に一時保存 ──────────────────
    let publicVideoUrl = "";
    let supabasePath   = "";

    if (platforms.includes("instagram")) {
      const ext      = (videoFile.name.split(".").pop() ?? "mp4").toLowerCase();
      const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const supabase = getSupabase();

      const { data: upData, error: upErr } = await supabase.storage
        .from("sns-temp")
        .upload(filename, await videoFile.arrayBuffer(), {
          contentType: videoFile.type || "video/mp4",
          upsert: true,
        });

      if (upErr) {
        return NextResponse.json(
          { error: `Supabase 保存エラー: ${upErr.message}` },
          { status: 500 }
        );
      }

      supabasePath = upData.path;
      const { data: urlData } = supabase.storage.from("sns-temp").getPublicUrl(supabasePath);
      publicVideoUrl = urlData.publicUrl;
    }

    // ── 各プラットフォームへ並行投稿 ──────────────────────────────────────────
    const tasks: Promise<PlatformResult>[] = [];

    if (platforms.includes("youtube")) {
      let accessToken = req.cookies.get("sns_yt_access_token")?.value;
      const refresh   = req.cookies.get("sns_yt_refresh_token")?.value;
      if (!accessToken && refresh) {
        accessToken = (await refreshYouTubeToken(refresh)) ?? undefined;
      }
      tasks.push(
        accessToken
          ? uploadToYouTube(videoFile, { title, description: caption, privacy: "public" }, accessToken)
          : Promise.resolve({ platform: "youtube" as const, success: false, error: "YouTube 未接続" })
      );
    }

    if (platforms.includes("instagram")) {
      const accessToken = req.cookies.get("sns_ig_access_token")?.value;
      const igUserId    = req.cookies.get("sns_ig_user_id")?.value;
      tasks.push(
        accessToken && igUserId && publicVideoUrl
          ? uploadToInstagram(publicVideoUrl, caption, accessToken, igUserId)
          : Promise.resolve({
              platform: "instagram" as const,
              success: false,
              error: !accessToken
                ? "Instagram 未接続"
                : !igUserId
                ? "Instagram Business Account ID が未取得（Facebook Page 連携を確認）"
                : "公開 URL の生成に失敗",
            })
      );
    }

    if (platforms.includes("tiktok")) {
      const accessToken = req.cookies.get("sns_tt_access_token")?.value;
      tasks.push(
        accessToken
          ? uploadToTikTok(videoFile, caption, accessToken)
          : Promise.resolve({ platform: "tiktok" as const, success: false, error: "TikTok 未接続" })
      );
    }

    const results = await Promise.all(tasks);

    // ── Supabase の一時ファイルを削除 ────────────────────────────────────────
    if (supabasePath) {
      await getSupabase().storage.from("sns-temp").remove([supabasePath]);
    }

    return NextResponse.json({ results });
  } catch (e) {
    console.error("[sns-poster/post]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
