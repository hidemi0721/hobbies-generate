import { getGeminiApiKey } from "./gemini";

export type GeminiImageSize = "1024x1024" | "1024x1792" | "1792x1024";

const LINE_PREFIX =
  "Black and white clean line art only, illustration composition sketch, " +
  "clear outlines, minimal shading if any, no color fill, no text, no watermark, " +
  "professional storyboard manga layout style. Scene: ";

function toAspectRatio(size: GeminiImageSize): string {
  switch (size) {
    case "1792x1024":
      return "16:9";
    case "1024x1792":
      return "9:16";
    default:
      return "1:1";
  }
}

type GenerateResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        inlineData?: { mimeType?: string; data?: string };
      }>;
    };
  }>;
  error?: { message?: string; code?: number };
};

export async function generateLineArtWithGemini(
  userPrompt: string,
  size: GeminiImageSize
): Promise<{ buffer: Buffer; mimeType: string }> {
  const key = getGeminiApiKey();
  const model =
    process.env.GEMINI_IMAGE_MODEL?.trim() || "gemini-2.5-flash-image";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const text = LINE_PREFIX + userPrompt;
  const body = {
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: {
        aspectRatio: toAspectRatio(size),
        imageSize: "1K",
      },
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": key,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });

  const json = (await res.json()) as GenerateResponse;

  if (!res.ok) {
    const msg =
      json.error?.message ??
      `Gemini 画像 API エラー (${res.status})。モデル名 GEMINI_IMAGE_MODEL や利用権限を確認してください。`;
    throw new Error(msg);
  }

  const parts = json.candidates?.[0]?.content?.parts ?? [];
  let lastData: Buffer | null = null;
  let lastMime = "image/png";

  for (const part of parts) {
    const data = part.inlineData?.data;
    if (data) {
      lastData = Buffer.from(data, "base64");
      lastMime = part.inlineData?.mimeType ?? "image/png";
    }
  }

  if (!lastData?.length) {
    throw new Error(
      "画像データが応答に含まれませんでした。GEMINI_IMAGE_MODEL を gemini-2.5-flash-image または gemini-3.1-flash-image-preview など、画像生成対応モデルに変更して試してください。"
    );
  }

  return { buffer: lastData, mimeType: lastMime };
}
