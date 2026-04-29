import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { uploadToInstagram } from "@/lib/sns-upload";

export const maxDuration = 300;

/** 予約投稿を処理するCronエンドポイント */
export async function GET(req: NextRequest) {
  // シークレットで保護（Vercel Cron: Authorization ヘッダー、外部サービス: クエリパラメータ）
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const querySecret = req.nextUrl.searchParams.get("secret");
  const isAuthorized =
    (authHeader && cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    (querySecret && querySecret === cronSecret);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  const now = new Date().toISOString();

  // 実行待ちの予約投稿を取得
  const { data: posts, error } = await supabase
    .from("scheduled_posts")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_time", now)
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!posts || posts.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  const results = [];

  for (const post of posts) {
    try {
      let result;

      if (post.platform === "instagram") {
        if (!post.ig_user_id) {
          throw new Error("Instagram Business Account ID が未設定");
        }
        result = await uploadToInstagram(
          post.video_url,
          post.caption ?? "",
          post.access_token,
          post.ig_user_id
        );
      } else if (post.platform === "tiktok") {
        result = await uploadToTikTokFromUrl(
          post.video_url,
          post.caption ?? "",
          post.access_token
        );
      } else {
        throw new Error(`未対応プラットフォーム: ${post.platform}`);
      }

      if (result.success) {
        await supabase
          .from("scheduled_posts")
          .update({ status: "done" })
          .eq("id", post.id);

        results.push({ id: post.id, platform: post.platform, success: true });
      } else {
        throw new Error(result.error ?? "投稿失敗");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      await supabase
        .from("scheduled_posts")
        .update({ status: "error", error_message: msg })
        .eq("id", post.id);
      results.push({ id: post.id, platform: post.platform, success: false, error: msg });
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}

/** TikTok: PULL_FROM_URL で投稿 */
async function uploadToTikTokFromUrl(
  videoUrl: string,
  caption: string,
  accessToken: string
) {
  const initRes = await fetch("https://open.tiktokapis.com/v2/post/publish/inbox/video/init/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      source_info: { source: "PULL_FROM_URL", video_url: videoUrl },
    }),
  });
  const initData = await initRes.json();
  if (!initData.data?.publish_id) {
    return { platform: "tiktok" as const, success: false, error: initData.error?.message ?? "初期化失敗" };
  }

  const { publish_id } = initData.data as { publish_id: string };
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const statusRes = await fetch("https://open.tiktokapis.com/v2/post/publish/status/fetch/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({ publish_id }),
    });
    const statusData = await statusRes.json();
    const status = statusData.data?.status as string | undefined;
    if (status === "PUBLISH_COMPLETE") return { platform: "tiktok" as const, success: true };
    if (status === "FAILED") return { platform: "tiktok" as const, success: false, error: statusData.data?.fail_reason ?? "公開失敗" };
  }
  return { platform: "tiktok" as const, success: false, error: "タイムアウト" };
}
