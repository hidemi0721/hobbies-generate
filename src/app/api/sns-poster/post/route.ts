import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import {
  uploadToYouTube,
  uploadToInstagram,
  uploadToTikTok,
  refreshYouTubeToken,
  type PlatformResult,
} from "@/lib/sns-upload";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      videoUrl: string;
      supabasePath: string;
      title: string;
      caption: string;
      platforms: string[];
      scheduledTimes?: Partial<Record<string, string>>; // ISO 8601 per platform
    };

    const { videoUrl, supabasePath, title, caption, platforms, scheduledTimes } = body;

    if (!videoUrl) {
      return NextResponse.json({ error: "videoUrl が必要です" }, { status: 400 });
    }
    if (!platforms || platforms.length === 0) {
      return NextResponse.json({ error: "投稿先を1つ以上選択してください" }, { status: 400 });
    }

    const tasks: Promise<PlatformResult>[] = [];

    // ── YouTube ──────────────────────────────────────────────────────
    if (platforms.includes("youtube")) {
      let accessToken = req.cookies.get("sns_yt_access_token")?.value;
      const refresh   = req.cookies.get("sns_yt_refresh_token")?.value;
      if (!accessToken && refresh) {
        accessToken = (await refreshYouTubeToken(refresh)) ?? undefined;
      }

      if (accessToken) {
        // Supabase から動画を取得して YouTube にアップロード
        tasks.push(
          (async (): Promise<PlatformResult> => {
            const videoRes = await fetch(videoUrl);
            if (!videoRes.ok) {
              return { platform: "youtube", success: false, error: "動画の取得に失敗" };
            }
            const videoBlob = await videoRes.blob();
            return uploadToYouTube(
              videoBlob,
              {
                title: title || "新しい動画",
                description: caption,
                privacy: "public",
                ...(scheduledTimes?.youtube ? { publishAt: scheduledTimes.youtube } : {}),
              },
              accessToken!
            );
          })()
        );
      } else {
        tasks.push(Promise.resolve({ platform: "youtube" as const, success: false, error: "YouTube 未接続" }));
      }
    }

    // ── Instagram ────────────────────────────────────────────────────
    if (platforms.includes("instagram")) {
      const accessToken = req.cookies.get("sns_ig_access_token")?.value;
      const igUserId    = req.cookies.get("sns_ig_user_id")?.value;
      tasks.push(
        accessToken && igUserId
          ? uploadToInstagram(videoUrl, caption, accessToken, igUserId)
          : Promise.resolve({
              platform: "instagram" as const,
              success: false,
              error: !accessToken ? "Instagram 未接続" : "Instagram Business Account ID が未取得",
            })
      );
    }

    // ── TikTok ───────────────────────────────────────────────────────
    if (platforms.includes("tiktok")) {
      const accessToken = req.cookies.get("sns_tt_access_token")?.value;
      if (accessToken) {
        // TikTok は PULL_FROM_URL で Supabase URL を直接指定
        tasks.push(uploadToTikTokUrl(videoUrl, caption, accessToken));
      } else {
        tasks.push(Promise.resolve({ platform: "tiktok" as const, success: false, error: "TikTok 未接続" }));
      }
    }

    const results = await Promise.all(tasks);

    return NextResponse.json({ results });
  } catch (e) {
    console.error("[sns-poster/post]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/** TikTok: PULL_FROM_URL（サーバーが直接 URL から取得する方式） */
async function uploadToTikTokUrl(
  videoUrl: string,
  caption: string,
  accessToken: string
): Promise<PlatformResult> {
  const initRes = await fetch("https://open.tiktokapis.com/v2/post/publish/inbox/video/init/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      source_info: {
        source: "PULL_FROM_URL",
        video_url: videoUrl,
      },
    }),
  });
  const initData = await initRes.json();
  if (!initData.data?.publish_id) {
    return {
      platform: "tiktok",
      success: false,
      error: initData.error?.message ?? "初期化失敗",
    };
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
    if (status === "PUBLISH_COMPLETE") {
      return { platform: "tiktok", success: true, url: "https://www.tiktok.com" };
    }
    if (status === "FAILED") {
      return { platform: "tiktok", success: false, error: statusData.data?.fail_reason ?? "公開失敗" };
    }
  }

  return { platform: "tiktok", success: false, error: "タイムアウト" };
}
