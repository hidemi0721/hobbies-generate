/**
 * 画像ファイルをブラウザ上でリサイズしてbase64に変換する
 * スマホカメラの大容量写真をAPIに送る前に圧縮する
 */
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
      const { width, height } = img;
      const scale = Math.min(1, maxPx / Math.max(width, height));
      const w = Math.round(width  * scale);
      const h = Math.round(height * scale);

      const canvas = document.createElement("canvas");
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }
      ctx.drawImage(img, 0, 0, w, h);

      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      resolve({ base64: dataUrl.split(",")[1], mediaType: "image/jpeg" });
    };

    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("画像の読み込みに失敗しました")); };
    img.src = objectUrl;
  });
}
