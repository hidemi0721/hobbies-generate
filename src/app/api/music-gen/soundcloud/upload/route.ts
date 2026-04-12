import { NextRequest, NextResponse } from "next/server";

export const maxRequestBodySize = "200mb";

export async function POST(req: NextRequest) {
  try {
    const accessToken = req.cookies.get("sc_access_token")?.value;
    if (!accessToken) {
      return NextResponse.json(
        { error: "SoundCloud 未接続です。先に認証してください。" },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const title       = (formData.get("title") as string) || "AI Generated Music";
    const description = (formData.get("description") as string) || "";
    const artworkFile = formData.get("artwork") as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: "音声ファイルが必要です" }, { status: 400 });
    }

    // SoundCloud v1 API: multipart upload
    const upload = new FormData();
    upload.append("track[title]", title.slice(0, 255));
    upload.append("track[description]", description.slice(0, 1000));
    upload.append("track[sharing]", "public");
    upload.append("track[asset_data]", audioFile, audioFile.name);
    if (artworkFile) {
      upload.append("track[artwork_data]", artworkFile, "artwork.jpg");
    }

    const res = await fetch("https://api.soundcloud.com/tracks", {
      method: "POST",
      headers: {
        Authorization: `OAuth ${accessToken}`,
      },
      body: upload,
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: `SoundCloud API エラー: ${err}` },
        { status: res.status }
      );
    }

    const result = await res.json();
    return NextResponse.json({
      url: result.permalink_url,
      track_id: result.id,
    });
  } catch (e) {
    console.error("[soundcloud/upload]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
