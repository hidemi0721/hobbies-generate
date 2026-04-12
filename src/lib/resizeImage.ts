/**
 * 画像ファイルをブラウザ上でリサイズしてbase64に変換する
 * スマホカメラの大容量写真をAPIに送る前に圧縮する
 * canvasが失敗した場合 (HEICなど) はFileReaderでraw base64にフォールバック
 */

/** FileReader で生のbase64を取得（canvasフォールバック用） */
function readAsBase64(file: File): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const comma = dataUrl.indexOf(",");
      if (comma === -1) { reject(new Error("FileReader: invalid data URL")); return; }
      const base64 = dataUrl.slice(comma + 1);
      const mediaType = file.type || "image/jpeg";
      resolve({ base64, mediaType });
    };
    reader.onerror = () => reject(new Error("FileReader failed"));
    reader.readAsDataURL(file);
  });
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
      const { width, height } = img;
      const scale = Math.min(1, maxPx / Math.max(width, height));
      const w = Math.round(width  * scale);
      const h = Math.round(height * scale);

      const canvas = document.createElement("canvas");
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        // canvasが使えない→FileReaderフォールバック
        readAsBase64(file).then(resolve).catch(reject);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);

      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      const base64 = dataUrl.split(",")[1];
      // canvas が空/不正な場合 (HEIC非対応など) はFileReaderフォールバック
      if (!base64 || base64.length < 100) {
        readAsBase64(file).then(resolve).catch(reject);
        return;
      }
      resolve({ base64, mediaType: "image/jpeg" });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      // img.loadが失敗→FileReaderフォールバック
      readAsBase64(file).then(resolve).catch(reject);
    };
    img.src = objectUrl;
  });
}
