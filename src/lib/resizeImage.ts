/**
 * 画像ファイルをブラウザ上でリサイズしてbase64に変換する
 * iOS Safariで大容量画像がcanvasで失敗する場合、小さいサイズで再試行する
 */

function tryCanvas(img: HTMLImageElement, maxPx: number, quality: number): string | null {
  const { width, height } = img;
  const scale = Math.min(1, maxPx / Math.max(width, height));
  const w = Math.round(width  * scale);
  const h = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width  = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, w, h);

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const base64 = dataUrl.split(",")[1];
  // canvas が空/不正な場合 (iOS大容量画像など) は null を返す
  if (!base64 || base64.length < 500) return null;
  return base64;
}

export async function resizeImage(
  file: File,
  maxPx = 1536,          // 長辺の最大px
  quality = 0.85         // JPEG品質
): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // まず通常サイズで試す
      let base64 = tryCanvas(img, maxPx, quality);

      // 失敗したら 768px で再試行（iOS メモリ不足対策）
      if (!base64) base64 = tryCanvas(img, 768, quality);

      // それでも失敗したら 512px で再試行
      if (!base64) base64 = tryCanvas(img, 512, quality);

      if (!base64) {
        reject(new Error("画像の変換に失敗しました。別の画像を試してください。"));
        return;
      }

      resolve({ base64, mediaType: "image/jpeg" });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("画像の読み込みに失敗しました。"));
    };

    img.src = objectUrl;
  });
}
