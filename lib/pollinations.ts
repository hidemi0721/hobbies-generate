/**
 * Pollinations 画像 API（gen.pollinations.ai）
 * @see https://enter.pollinations.ai/api/docs
 */

const LINE_PREFIX =
  "Black and white clean line art only, illustration composition sketch, " +
  "clear outlines, minimal shading if any, no color fill, no text, no watermark, " +
  "professional storyboard manga layout style. Scene: ";

export type ImageSize = "1024x1024" | "1024x1792" | "1792x1024";

export function sizeToDimensions(size: ImageSize): { width: number; height: number } {
  switch (size) {
    case "1792x1024":
      return { width: 1280, height: 720 };
    case "1024x1792":
      return { width: 720, height: 1280 };
    default:
      return { width: 1024, height: 1024 };
  }
}

/** GET https://gen.pollinations.ai/image/{urlEncodedPrompt}?width=&height= */
export function buildGenPollinationsImageUrl(
  userPrompt: string,
  size: ImageSize = "1024x1024"
): string {
  const full = LINE_PREFIX + userPrompt;
  const { width, height } = sizeToDimensions(size);
  const encodedPrompt = encodeURIComponent(full);
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
  });
  return `https://gen.pollinations.ai/image/${encodedPrompt}?${params.toString()}`;
}

/** APIキーは任意（未設定でも動作する） */
export function getPollinationsApiKey(): string | undefined {
  return process.env.POLLINATIONS_API_KEY?.trim() || undefined;
}
