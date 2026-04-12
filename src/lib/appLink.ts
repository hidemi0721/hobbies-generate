/**
 * モバイルでネイティブアプリを優先して開くリンク処理
 * アプリがインストールされていない場合はブラウザでWebページを開く
 */

type AppLinkConfig = {
  webUrl: string;
  iosScheme?: string;   // iOS アプリ URL スキーム
  androidScheme?: string; // Android Intent URL
};

const APP_LINKS: Record<string, AppLinkConfig> = {
  "suno.com": {
    webUrl: "https://suno.com",
    iosScheme: "suno://", // iOS アプリあり
    // Android アプリは未確認のため未設定
  },
  "youtube.com": {
    webUrl: "https://youtube.com",
    iosScheme: "youtube://",
    androidScheme: "intent://youtube.com#Intent;package=com.google.android.youtube;scheme=https;end",
  },
  "soundcloud.com": {
    webUrl: "https://soundcloud.com",
    iosScheme: "soundcloud://",
    androidScheme: "intent://soundcloud.com#Intent;package=com.soundcloud.android;scheme=https;end",
  },
};

export function openAppLink(url: string): void {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (!isMobile) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  // マッチするアプリ設定を探す
  const matched = Object.values(APP_LINKS).find(cfg => url.startsWith(cfg.webUrl));
  if (!matched) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const scheme = isIos ? matched.iosScheme : matched.androidScheme;

  if (!scheme) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  // アプリスキームを試し、失敗したらWebにフォールバック
  const fallbackTimer = setTimeout(() => {
    window.open(url, "_blank", "noopener,noreferrer");
  }, 1500);

  window.addEventListener("blur", () => clearTimeout(fallbackTimer), { once: true });
  window.location.href = scheme;
}
