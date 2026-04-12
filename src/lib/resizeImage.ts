/**
 * 画像ファイルをブラウザ上でリサイズしてbase64に変換する
 * iOS Safariでcanvas操作が例外を投げる場合も安全に処理する
 */

function tryCanvas(img: HTMLImageElement, maxPx: number, quality: number): string | null {
  try {
    const { width, height } = img;
    if (!width || !height) return null;

    const scale = Math.min(1, maxPx / Math.max(width, height));
    const w = Math.round(width  * scale);
    const h = Math.round(height * scale);
    if (!w || !h) return null;

    const canvas = document.createElement("canvas");
    canvas.width  = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, w, h);

    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    const base64 = dataUrl.split(",")[1];
    if (!base64 || base64.length < 500) return null;
    return base64;
  } catch {
    return null;
  }
}

export async function resizeImage(
  file: File,
  maxPx = 1536,
  quality = 0.85
): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        let base64 = tryCanvas(img, maxPx, quality);
        if (!base64) base64 = tryCanvas(img, 768, quality);
        if (!base64) base64 = tryCanvas(img, 512, 0.7);

        if (!base64) {
          reject(new Error("画像の変換に失敗しました。別の画像を試してください。"));
          return;
        }
        resolve({ base64, mediaType: "image/jpeg" });
      } catch (e) {
        reject(new Error("画像の変換中にエラーが発生しました。"));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("画像の読み込みに失敗しました。"));
    };

    img.src = objectUrl;
  });
}
