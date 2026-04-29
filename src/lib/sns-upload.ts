/**
 * SNS プラットフォームへの動画投稿コアロジック
 *
 * 前提:
 *   - YouTube  : Google OAuth 2.0 (youtube.upload スコープ)
 *   - Instagram: Facebook Graph API (instagram_content_publish スコープ)
 *                動画は公開 URL が必要 → Supabase で一時公開
 *   - TikTok   : TikTok Content Posting API (要アプリ審査)
 */

export type PlatformResult = {
  platform: "youtube" | "instagram" | "tiktok";
  success: boolean;
  url?: string;
  error?: string;
};

// ── YouTube ─────────────────────────────────────────────────────────────────

export async function refreshYouTubeToken(refreshToken: string): Promise<string | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.YOUTUBE_CLIENT_ID ?? "",
      client_secret: process.env.YOUTUBE_CLIENT_SECRET ?? "",
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  return data.access_token ?? null;
}

export async function uploadToYouTube(
  videoBlob: Blob,
  opts: {
    title: string;
    description: string;
    tags?: string[];
    privacy?: "public" | "unlisted" | "private";
    publishAt?: string; // ISO 8601 — 指定時は予約投稿
  },
  accessToken: string
): Promise<PlatformResult> {
  const mimeType = videoBlob.type || "video/mp4";
  const isScheduled = !!opts.publishAt;
  const metadata = {
    snippet: {
      title: opts.title.slice(0, 100),
      description: opts.description.slice(0, 5000),
      tags: opts.tags ?? [],
      categoryId: "22", // People & Blogs
    },
    status: {
      // 予約投稿は必ず private + publishAt が必要
      privacyStatus: isScheduled ? "private" : (opts.privacy ?? "public"),
      selfDeclaredMadeForKids: false,
      ...(isScheduled ? { publishAt: opts.publishAt } : {}),
    },
  };

  // Resumable upload — Step 1: セッション開始
  const initRes = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": mimeType,
        "X-Upload-Content-Length": String(videoBlob.size),
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!initRes.ok) {
    return {
      platform: "youtube",
      success: false,
      error: `API error ${initRes.status}: ${await initRes.text()}`,
    };
  }

  const uploadUrl = initRes.headers.get("Location");
  if (!uploadUrl) {
    return { platform: "youtube", success: false, error: "Upload URL の取得に失敗" };
  }

  // Step 2: 動画データ送信
  const videoBuffer = await videoBlob.arrayBuffer();
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(videoBlob.size),
    },
    body: videoBuffer,
  });

  if (!uploadRes.ok) {
    return {
      platform: "youtube",
      success: false,
      error: `Upload error ${uploadRes.status}: ${await uploadRes.text()}`,
    };
  }

  const result = await uploadRes.json();
  return {
    platform: "youtube",
    success: true,
    url: `https://www.youtube.com/watch?v=${result.id}`,
  };
}

// ── Instagram ────────────────────────────────────────────────────────────────

export async function uploadToInstagram(
  publicVideoUrl: string,
  caption: string,
  accessToken: string,
  igUserId: string
): Promise<PlatformResult> {
  // Step 1: Reels コンテナ作成
  const containerRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "REELS",
      video_url: publicVideoUrl,
      caption: caption.slice(0, 2200),
      share_to_feed: true,
      access_token: accessToken,
    }),
  });
  const containerData = await containerRes.json();
  if (!containerData.id) {
    return {
      platform: "instagram",
      success: false,
      error: containerData.error?.message ?? "コンテナ作成失敗",
    };
  }

  const creationId: string = containerData.id;

  // Step 2: 動画処理完了までポーリング（最大30秒）
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const statusRes = await fetch(
      `https://graph.facebook.com/v21.0/${creationId}?fields=status_code&access_token=${accessToken}`
    );
    const status = await statusRes.json();
    if (status.status_code === "FINISHED") break;
    if (status.status_code === "ERROR") {
      return { platform: "instagram", success: false, error: "動画処理エラー" };
    }
  }

  // Step 3: 公開
  const publishRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: creationId,
      access_token: accessToken,
    }),
  });
  const publishData = await publishRes.json();
  if (!publishData.id) {
    return {
      platform: "instagram",
      success: false,
      error: publishData.error?.message ?? "公開失敗",
    };
  }

  return {
    platform: "instagram",
    success: true,
    url: `https://www.instagram.com/p/${publishData.id}/`,
  };
}

// ── TikTok ───────────────────────────────────────────────────────────────────

export async function uploadToTikTok(
  videoBlob: Blob,
  caption: string,
  accessToken: string
): Promise<PlatformResult> {
  // video.upload スコープ = クリエイターの受信トレイ（下書き）に保存
  // video.publish スコープ（要審査）= 直接投稿
  // Step 1: アップロード初期化
  const initRes = await fetch("https://open.tiktokapis.com/v2/post/publish/inbox/video/init/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      source_info: {
        source: "FILE_UPLOAD",
        video_size: videoBlob.size,
        chunk_size: videoBlob.size,
        total_chunk_count: 1,
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

  const { publish_id, upload_url } = initData.data as { publish_id: string; upload_url: string };

  // Step 2: 動画アップロード
  const videoBuffer = await videoBlob.arrayBuffer();
  const uploadRes = await fetch(upload_url, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Range": `bytes 0-${videoBlob.size - 1}/${videoBlob.size}`,
      "Content-Length": String(videoBlob.size),
    },
    body: videoBuffer,
  });

  if (!uploadRes.ok) {
    return {
      platform: "tiktok",
      success: false,
      error: `アップロードエラー: ${uploadRes.status}`,
    };
  }

  // Step 3: 公開ステータスをポーリング（最大30秒）
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
      const shareId = statusData.data?.publicaly_available_post_id?.[0] as string | undefined;
      return {
        platform: "tiktok",
        success: true,
        url: shareId ? `https://www.tiktok.com/@me/video/${shareId}` : "https://www.tiktok.com",
      };
    }
    if (status === "FAILED") {
      return {
        platform: "tiktok",
        success: false,
        error: statusData.data?.fail_reason ?? "公開失敗",
      };
    }
  }

  return { platform: "tiktok", success: false, error: "タイムアウト" };
}
