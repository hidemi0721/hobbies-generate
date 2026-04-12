import { NextRequest, NextResponse } from "next/server";

export const maxRequestBodySize = "500mb";

async function refreshToken(refreshToken: string): Promise<string | null> {
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

export async function POST(req: NextRequest) {
  try {
    let accessToken = req.cookies.get("yt_access_token")?.value;
    const refresh   = req.cookies.get("yt_refresh_token")?.value;

    if (!accessToken && refresh) {
      accessToken = (await refreshToken(refresh)) ?? undefined;
    }
    if (!accessToken) {
      return NextResponse.json({ error: "YouTube 未接続です。先に認証してください。" }, { status: 401 });
    }

    const formData = await req.formData();
    const videoBlob = formData.get("video") as File | null;
    const title       = (formData.get("title") as string) || "AI Generated Music";
    const description = (formData.get("description") as string) || "";
    const privacy     = (formData.get("privacy") as string) || "unlisted";

    if (!videoBlob) return NextResponse.json({ error: "動画ファイルが必要です" }, { status: 400 });

    // YouTube Data API v3 resumable upload
    const metadata = {
      snippet: {
        title: title.slice(0, 100),
        description: description.slice(0, 5000),
        tags: ["AI音楽", "自動生成", "Suno"],
        categoryId: "10",
      },
      status: {
        privacyStatus: privacy,
        selfDeclaredMadeForKids: false,
      },
    };

    // Step 1: セッション開始
    const initRes = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": "video/webm",
          "X-Upload-Content-Length": String(videoBlob.size),
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!initRes.ok) {
      const err = await initRes.text();
      return NextResponse.json({ error: `YouTube API エラー: ${err}` }, { status: initRes.status });
    }

    const uploadUrl = initRes.headers.get("Location");
    if (!uploadUrl) return NextResponse.json({ error: "アップロードURLの取得に失敗しました" }, { status: 500 });

    // Step 2: 動画データ送信
    const videoBuffer = await videoBlob.arrayBuffer();
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "video/webm",
        "Content-Length": String(videoBlob.size),
      },
      body: videoBuffer,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      return NextResponse.json({ error: `アップロードエラー: ${err}` }, { status: uploadRes.status });
    }

    const result = await uploadRes.json();
    const videoId = result.id;
    return NextResponse.json({
      url: `https://www.youtube.com/watch?v=${videoId}`,
      video_id: videoId,
    });
  } catch (e) {
    console.error("[youtube/upload]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
