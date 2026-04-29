"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

// ── 型定義 ───────────────────────────────────────────────────────────────────

type Platform = "youtube" | "instagram" | "tiktok";

type ConnectionStatus = Record<Platform, boolean>;

type PostResult = {
  platform: Platform;
  success: boolean;
  url?: string;
  error?: string;
};

type PostState = "idle" | "uploading" | "done";

type ScheduledItem = { platform: Platform; time: string };

type SavedVideo = {
  id: string;
  name: string;
  url: string;
  path: string;
  savedAt: string;
};

// ── プラットフォーム設定 ────────────────────────────────────────────────────

const PLATFORMS: {
  id: Platform;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  authPath: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "youtube",
    label: "YouTube Shorts",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    borderColor: "border-red-200 dark:border-red-800",
    authPath: "/api/sns-poster/youtube/auth",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    id: "instagram",
    label: "Instagram Reels",
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-50 dark:bg-pink-950/30",
    borderColor: "border-pink-200 dark:border-pink-800",
    authPath: "/api/sns-poster/instagram/auth",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
  },
  {
    id: "tiktok",
    label: "TikTok",
    color: "text-gray-800 dark:text-gray-200",
    bgColor: "bg-gray-50 dark:bg-gray-900/50",
    borderColor: "border-gray-200 dark:border-gray-700",
    authPath: "/api/sns-poster/tiktok/auth",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.21 8.21 0 0 0 4.79 1.52V6.77a4.85 4.85 0 0 1-1.02-.08z" />
      </svg>
    ),
  },
];

// ── SNS 接続カード ──────────────────────────────────────────────────────────

function PlatformCard({
  platform,
  connected,
  lastPostTime,
  onConnect,
  onDisconnect,
}: {
  platform: (typeof PLATFORMS)[number];
  connected: boolean;
  lastPostTime?: string;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  return (
    <div
      className={`flex items-center justify-between p-3 rounded-xl border ${platform.borderColor} ${platform.bgColor}`}
    >
      <div className="flex items-center gap-2.5">
        <span className={platform.color}>{platform.icon}</span>
        <div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {platform.label}
          </span>
          {lastPostTime && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500">
              最終投稿: {new Date(lastPostTime).toLocaleString("ja-JP")}
            </p>
          )}
        </div>
        {connected && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            接続済み
          </span>
        )}
      </div>
      {connected ? (
        <button
          onClick={onDisconnect}
          className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
        >
          解除
        </button>
      ) : (
        <button
          onClick={onConnect}
          className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800"
        >
          接続
        </button>
      )}
    </div>
  );
}

// ── 結果バッジ ──────────────────────────────────────────────────────────────

function ResultBadge({ result }: { result: PostResult }) {
  const p = PLATFORMS.find((x) => x.id === result.platform)!;
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-xl border ${
        result.success
          ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30"
          : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30"
      }`}
    >
      <span className={p.color}>{p.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{p.label}</p>
        {result.success ? (
          result.url ? (
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline break-all"
            >
              {result.url}
            </a>
          ) : (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">投稿完了</p>
          )
        ) : (
          <p className="text-xs text-red-600 dark:text-red-400">{result.error}</p>
        )}
      </div>
      <span className="shrink-0 text-lg">{result.success ? "✓" : "✗"}</span>
    </div>
  );
}

// ── メインコンポーネント ────────────────────────────────────────────────────

function SnsPosterInner() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const [connections, setConnections] = useState<ConnectionStatus>({
    youtube: false,
    instagram: false,
    tiktok: false,
  });

  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [scheduledTimes, setScheduledTimes] = useState<Partial<Record<Platform, string>>>({});
  const [pendingSchedules, setPendingSchedules] = useState<ScheduledItem[]>([]);
  const [videoFile, setVideoFile]   = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>("");
  const [title, setTitle]           = useState("");
  const [caption, setCaption]       = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [postState, setPostState]   = useState<PostState>("idle");
  const [uploadProgress, setUploadProgress] = useState(0); // 0-100
  const [results, setResults]       = useState<PostResult[]>([]);
  const [globalError, setGlobalError] = useState("");
  const [toast, setToast]           = useState("");
  const [igIdInput, setIgIdInput]   = useState("17841408155441290");
  const [igIdSaved, setIgIdSaved]   = useState(false);
  const [lastPostTimes, setLastPostTimes] = useState<Partial<Record<Platform, string>>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem("sns_last_post_times");
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [savedVideos, setSavedVideos] = useState<SavedVideo[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const s = localStorage.getItem("sns_saved_videos");
      return s ? JSON.parse(s) : [];
    } catch { return []; }
  });
  const [reuseVideo, setReuseVideo] = useState<SavedVideo | null>(null);

  const fileInputRef        = useRef<HTMLInputElement>(null);
  const cameraInputRef      = useRef<HTMLInputElement>(null);
  const videoRef            = useRef<HTMLVideoElement>(null);

  // 接続ステータスを取得
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/sns-poster/status");
      const data = await res.json() as ConnectionStatus;
      setConnections(data);
      // 接続済みのプラットフォームを自動選択
      setSelectedPlatforms((prev) => {
        const connected = (Object.keys(data) as Platform[]).filter((k) => data[k]);
        return connected.length > 0 && prev.length === 0 ? connected : prev;
      });
    } catch {}
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // URL クエリパラメータからの通知
  useEffect(() => {
    const ytOk  = searchParams.get("yt_connected");
    const igOk  = searchParams.get("ig_connected");
    const ttOk  = searchParams.get("tt_connected");
    const ytErr = searchParams.get("yt_error");
    const igErr = searchParams.get("ig_error");
    const ttErr = searchParams.get("tt_error");
    const igWarn = searchParams.get("ig_warn");

    if (ytOk)  { showToast("YouTube を接続しました"); fetchStatus(); }
    if (igOk)  { showToast(igWarn ? "Instagram 接続済み（Business Account ID 未取得 — Facebook Page の連携を確認）" : "Instagram を接続しました"); fetchStatus(); }
    if (ttOk)  { showToast("TikTok を接続しました"); fetchStatus(); }
    if (ytErr) { showToast(`YouTube 接続エラー: ${ytErr}`, true); }
    if (igErr) { showToast(`Instagram 接続エラー: ${igErr}`, true); }
    if (ttErr) { showToast(`TikTok 接続エラー: ${ttErr}`, true); }

    if (ytOk || igOk || ttOk || ytErr || igErr || ttErr) {
      router.replace("/sns-poster");
    }
  }, [searchParams, fetchStatus, router]);

  const showToast = (msg: string, isError = false) => {
    setToast(msg);
    setTimeout(() => setToast(""), isError ? 6000 : 3000);
  };

  const addToSavedVideos = useCallback((video: SavedVideo) => {
    setSavedVideos(prev => {
      if (prev.some(v => v.path === video.path)) return prev;
      let next = [video, ...prev];
      if (next.length > 10) {
        const toDelete = next.slice(10);
        next = next.slice(0, 10);
        for (const v of toDelete) {
          fetch("/api/sns-poster/saved-videos", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: v.path }),
          }).catch(() => {});
        }
      }
      localStorage.setItem("sns_saved_videos", JSON.stringify(next));
      return next;
    });
  }, []);

  const deleteFromSavedVideos = useCallback(async (video: SavedVideo) => {
    await fetch("/api/sns-poster/saved-videos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: video.path }),
    }).catch(() => {});
    setSavedVideos(prev => {
      const next = prev.filter(v => v.id !== video.id);
      localStorage.setItem("sns_saved_videos", JSON.stringify(next));
      return next;
    });
    setReuseVideo(prev => prev?.id === video.id ? null : prev);
    setVideoPreview(prev => {
      if (reuseVideo?.id === video.id) return "";
      return prev;
    });
  }, [reuseVideo]);

  const markPosted = (platforms: Platform[]) => {
    const now = new Date().toISOString();
    setLastPostTimes((prev) => {
      const next = { ...prev };
      for (const p of platforms) next[p] = now;
      localStorage.setItem("sns_last_post_times", JSON.stringify(next));
      return next;
    });
  };

  // ビデオファイルのセット
  const setVideo = (file: File) => {
    if (!file.type.startsWith("video/")) {
      showToast("動画ファイルを選択してください", true);
      return;
    }
    setVideoFile(file);
    setReuseVideo(null);
    const url = URL.createObjectURL(file);
    setVideoPreview(url);
    setResults([]);
    setGlobalError("");
  };

  // ドラッグ＆ドロップ
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) setVideo(file);
  };

  // プラットフォーム選択トグル
  const togglePlatform = (id: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  // datetime-local の値（ローカル時刻）を UTC ISO 文字列に変換
  const toUtcIso = (localDatetime: string): string =>
    new Date(localDatetime).toISOString();

  // プラットフォームごとに SNS 投稿 API を呼び出す
  const callPostApi = async (
    platforms: Platform[],
    publicUrl: string,
    supabasePath: string,
    schedules: Partial<Record<Platform, string>>
  ): Promise<PostResult[]> => {
    // UTC に変換してから送信（YouTube publishAt / Instagram scheduled_publish_time 用）
    const scheduledTimesUtc = Object.fromEntries(
      Object.entries(schedules).map(([k, v]) => [k, v ? toUtcIso(v) : v])
    ) as Partial<Record<Platform, string>>;

    const res = await fetch("/api/sns-poster/post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        videoUrl: publicUrl,
        supabasePath,
        title: title || (videoFile?.name ?? reuseVideo?.name ?? "動画").replace(/\.[^.]+$/, ""),
        caption,
        platforms,
        scheduledTimes: scheduledTimesUtc,
      }),
    });
    const data = await res.json() as { results?: PostResult[]; error?: string };
    if (!res.ok || data.error) throw new Error(data.error ?? "投稿に失敗しました");
    return data.results ?? [];
  };

  // 投稿（2段階: Supabase 直接アップロード → SNS 投稿）
  const handlePost = async () => {
    if (!videoFile && !reuseVideo) { showToast("動画を選択してください", true); return; }
    if (selectedPlatforms.length === 0) { showToast("投稿先を選択してください", true); return; }

    setPostState("uploading");
    setUploadProgress(0);
    setResults([]);
    setPendingSchedules([]);
    setGlobalError("");

    try {
      let publicUrl: string;
      let supabasePath: string;
      const videoName = videoFile?.name ?? reuseVideo?.name ?? "動画";

      if (reuseVideo) {
        // 保存済み動画を再利用（アップロードスキップ）
        publicUrl = reuseVideo.url;
        supabasePath = reuseVideo.path;
        setUploadProgress(100);
      } else {
        // Step 1: 署名付きアップロード URL を取得
        const urlRes = await fetch("/api/sns-poster/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: videoFile!.name, contentType: videoFile!.type }),
        });
        const urlData = await urlRes.json() as {
          signedUrl?: string; path?: string; publicUrl?: string; error?: string;
        };
        if (!urlRes.ok || !urlData.signedUrl) {
          setGlobalError(urlData.error ?? "アップロード URL の取得に失敗しました");
          return;
        }

        // Step 2: Supabase に直接アップロード（XMLHttpRequest でプログレス取得）
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", urlData.signedUrl!);
          xhr.setRequestHeader("Content-Type", videoFile!.type || "video/mp4");
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setUploadProgress(Math.round((e.loaded / e.total) * 100));
            }
          };
          xhr.onload  = () => xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`));
          xhr.onerror = () => reject(new Error("Upload network error"));
          xhr.send(videoFile!);
        });

        setUploadProgress(100);
        publicUrl = urlData.publicUrl!;
        supabasePath = urlData.path!;

        // アップロード完了直後に保存履歴・Library へ登録
        const savedAt = new Date().toISOString();
        addToSavedVideos({
          id: crypto.randomUUID(),
          name: videoName,
          url: publicUrl,
          path: supabasePath,
          savedAt,
        });

        // Library にも保存（sns-temp → library バケットへコピー）
        try {
          const libRes = await fetch("/api/library/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tool: "video",
              title: videoName.replace(/\.[^.]+$/, ""),
              imageUrl: publicUrl,
              extraUrls: [],
              metadata: { savedAt },
              uploadVideo: true,
            }),
          });
          if (!libRes.ok) {
            const err = await libRes.json().catch(() => ({})) as { error?: string };
            showToast(`ライブラリ保存失敗: ${err.error ?? libRes.status}`, true);
          }
        } catch (e) {
          showToast(`ライブラリ保存エラー: ${e instanceof Error ? e.message : e}`, true);
        }
      }

      const now = Date.now();

      // 即時投稿 / サーバー予約 を振り分け
      const immediate: Platform[] = [];
      const serverScheduled: { platform: Platform; isoTime: string }[] = [];

      for (const pid of selectedPlatforms) {
        const t = scheduledTimes[pid];
        if (t && pid !== "youtube" && new Date(t).getTime() > now) {
          serverScheduled.push({ platform: pid, isoTime: toUtcIso(t) });
        } else {
          immediate.push(pid);
        }
      }

      // Step 3a: 即時投稿
      if (immediate.length > 0) {
        const path = serverScheduled.length === 0 ? supabasePath : "";
        const immediateSchedules = Object.fromEntries(
          immediate.flatMap(p => scheduledTimes[p] ? [[p, toUtcIso(scheduledTimes[p]!)]] : [])
        ) as Partial<Record<Platform, string>>;
        const r = await callPostApi(immediate, publicUrl, path, immediateSchedules);
        setResults(r);
        markPosted(r.filter((x) => x.success).map((x) => x.platform));
      }

      // Step 3b: サーバー予約（Supabase に保存 → Cron で実行）
      if (serverScheduled.length > 0) {
        const savedResults: PostResult[] = [];
        for (const { platform, isoTime } of serverScheduled) {
          const res = await fetch("/api/sns-poster/schedule", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              platform,
              videoUrl: publicUrl,
              supabasePath,
              title: title || (videoFile?.name ?? reuseVideo?.name ?? "動画").replace(/\.[^.]+$/, ""),
              caption,
              scheduledTime: isoTime,
            }),
          });
          const data = await res.json() as { ok?: boolean; error?: string };
          const pLabel = PLATFORMS.find(p => p.id === platform)?.label ?? platform;
          if (data.ok) {
            markPosted([platform]);
            savedResults.push({
              platform: platform as Platform,
              success: true,
              url: `予約完了: ${new Date(isoTime).toLocaleString("ja-JP")} に自動投稿`,
            });
          } else {
            savedResults.push({
              platform: platform as Platform,
              success: false,
              error: data.error ?? "予約保存失敗",
            });
          }
        }
        setResults(prev => [...prev, ...savedResults]);
        showToast("サーバー予約を設定しました。タブを閉じても投稿されます。");
      }

    } catch (e) {
      setGlobalError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setPostState("done");
    }
  };

  // 切断
  const handleDisconnect = async (platform: Platform) => {
    await fetch("/api/sns-poster/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform }),
    });
    await fetchStatus();
    showToast(`${platform} の接続を解除しました`);
  };

  const isPosting = postState === "uploading";

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* ── ヘッダー ── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SNS Bulk Poster</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          YouTube Shorts / Instagram Reels / TikTok に一括投稿
        </p>
      </div>

      {/* ── SNS 接続状態 ── */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-3">
          接続アカウント
        </h2>
        <div className="flex flex-col gap-2">
          {PLATFORMS.map((p) => (
            <PlatformCard
              key={p.id}
              platform={p}
              connected={connections[p.id]}
              lastPostTime={lastPostTimes[p.id]}
              onConnect={() => (window.location.href = p.authPath)}
              onDisconnect={() => handleDisconnect(p.id)}
            />
          ))}
        </div>
        <p className="mt-2 text-[11px] text-gray-400 dark:text-gray-600">
          ※ Instagram は Business/Creator アカウント + Facebook Page の連携が必要です。<br />
          ※ TikTok は Content Posting API のアプリ審査が完了している必要があります。
        </p>
      </section>

      {/* ── Instagram Business Account ID 手動設定 ── */}
      {connections.instagram && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-3">
            Instagram Business Account ID
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={igIdInput}
              onChange={(e) => setIgIdInput(e.target.value.trim())}
              placeholder="例: 17841408155441290"
              className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              onClick={async () => {
                if (!igIdInput) return;
                const res = await fetch("/api/sns-poster/instagram/set-id", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ igUserId: igIdInput }),
                });
                if (res.ok) {
                  setIgIdSaved(true);
                  showToast("Instagram Business Account ID を設定しました");
                } else {
                  showToast("IDの設定に失敗しました", true);
                }
              }}
              disabled={!igIdInput}
              className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 text-white text-sm font-medium transition-all"
            >
              設定
            </button>
          </div>
          {igIdSaved && (
            <p className="mt-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
              ✓ ID を設定しました。Instagram への投稿が可能になりました。
            </p>
          )}
          <p className="mt-1.5 text-[11px] text-gray-400 dark:text-gray-600">
            Meta Business Suite → 設定 → Instagram アカウント で確認できる数字IDを入力してください。
          </p>
        </section>
      )}

      {/* ── 保存した動画 ── */}
      {savedVideos.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-3">
            保存した動画 <span className="normal-case font-normal text-gray-300 dark:text-gray-700">({savedVideos.length}/10)</span>
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {savedVideos.map(v => (
              <div
                key={v.id}
                className={`relative shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                  reuseVideo?.id === v.id
                    ? "border-indigo-500 shadow-md"
                    : "border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700"
                }`}
                onClick={() => {
                  setReuseVideo(v);
                  setVideoFile(null);
                  setVideoPreview(v.url);
                  setResults([]);
                  setGlobalError("");
                }}
              >
                <video
                  src={v.url}
                  className="w-full h-full object-cover pointer-events-none"
                  muted
                  playsInline
                  preload="metadata"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-1 py-1">
                  <p className="text-[8px] text-white truncate">{v.name}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteFromSavedVideos(v); }}
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/50 hover:bg-red-500 flex items-center justify-center text-white transition-colors"
                  title="削除"
                >
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          {reuseVideo && (
            <p className="mt-1.5 text-[11px] text-indigo-600 dark:text-indigo-400">
              ✓ 保存済み「{reuseVideo.name}」を使用中
              <button
                onClick={() => { setReuseVideo(null); setVideoPreview(""); setVideoFile(null); }}
                className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline"
              >
                解除
              </button>
            </p>
          )}
        </section>
      )}

      {/* ── 動画選択 ── */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-3">
          動画ファイル
        </h2>
        {videoPreview ? (
          <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-black">
            <video
              ref={videoRef}
              src={videoPreview}
              controls
              playsInline
              className="w-full max-h-72 object-contain"
            />
            <button
              onClick={() => { setVideoFile(null); setVideoPreview(""); }}
              className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors"
              aria-label="動画を削除"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="p-2 text-xs text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
              <span className="truncate mr-2">{videoFile?.name ?? reuseVideo?.name}</span>
              {videoFile && (
                <span className="shrink-0">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {/* PC: ドラッグ＆ドロップ */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={`w-full rounded-xl border-2 border-dashed py-8 px-4 text-center transition-all cursor-pointer ${
                isDragging
                  ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30"
                  : "border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-gray-50 dark:hover:bg-gray-900"
              }`}
            >
              <svg className="mx-auto mb-3 h-8 w-8 text-gray-300 dark:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82V15a1 1 0 01-1.447.894L15 13.5M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                <span className="hidden sm:inline">ドラッグ＆ドロップ、または</span>タップして選択
              </p>
              <p className="text-[10px] text-gray-300 dark:text-gray-700 mt-1">MP4 / MOV / WebM</p>
            </button>

            {/* モバイル: カメラ撮影ボタン */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="sm:hidden flex items-center justify-center gap-2 w-full rounded-xl border border-gray-200 dark:border-gray-700 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
              </svg>
              カメラで撮影
            </button>
          </div>
        )}

        {/* ギャラリー選択（全デバイス） */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) setVideo(f); }}
        />
        {/* カメラ直接撮影（モバイル向け） */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="video/*"
          capture="environment"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) setVideo(f); }}
        />
      </section>

      {/* ── タイトル & キャプション ── */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-3">
          投稿内容
        </h2>
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              タイトル
              <span className="ml-1 text-[10px] text-gray-400">— YouTube: 動画タイトル / TikTok: 説明文の冒頭 / Instagram: 未使用</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder="動画タイトルを入力..."
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              キャプション / 説明文
              <span className="ml-1 text-[10px] text-gray-400">— YouTube: 概要欄 / TikTok: 説明文・ハッシュタグ / Instagram: キャプション・ハッシュタグ</span>
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={2200}
              rows={4}
              placeholder="#music #AI #shorts"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-600 resize-none"
            />
            <p className="text-right text-[10px] text-gray-300 dark:text-gray-700 mt-0.5">
              {caption.length} / 2,200
            </p>
          </div>
        </div>
      </section>

      {/* ── 投稿先選択 ── */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-3">
          投稿先
        </h2>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => {
            const checked = selectedPlatforms.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => togglePlatform(p.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                  checked
                    ? `${p.bgColor} ${p.borderColor} ${p.color}`
                    : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <span className={checked ? "" : "opacity-40"}>{p.icon}</span>
                {p.label}
                {checked && (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
        {selectedPlatforms.some((id) => !connections[id]) && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            未接続のプラットフォームが選択されています。先に接続してください。
          </p>
        )}
      </section>

      {/* ── 投稿予約 ── */}
      {selectedPlatforms.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-3">
            投稿予約 <span className="normal-case font-normal text-gray-300 dark:text-gray-700">（任意）</span>
          </h2>
          <div className="flex flex-col gap-2">
            {selectedPlatforms.map((pid) => {
              const p = PLATFORMS.find((x) => x.id === pid)!;
              const val = scheduledTimes[pid] ?? "";
              const minVal = new Date(Date.now() + 60000).toISOString().slice(0, 16);
              return (
                <div
                  key={pid}
                  className={`flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-xl border ${p.borderColor} ${p.bgColor}`}
                >
                  <div className={`flex items-center gap-2 shrink-0 ${p.color}`}>
                    {p.icon}
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{p.label}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="datetime-local"
                      value={val}
                      min={minVal}
                      onChange={(e) =>
                        setScheduledTimes((prev) => ({ ...prev, [pid]: e.target.value }))
                      }
                      className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-600"
                    />
                    {val && (
                      <button
                        onClick={() =>
                          setScheduledTimes((prev) => {
                            const n = { ...prev };
                            delete n[pid];
                            return n;
                          })
                        }
                        className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors px-1.5 py-1 rounded-lg"
                        title="クリア"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {val && (
                    <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded-full shrink-0">
                      予約
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 予約中バッジ ── */}
      {pendingSchedules.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-3">
            予約待機中
          </h2>
          <div className="flex flex-col gap-2">
            {pendingSchedules.map(({ platform, time }) => {
              const p = PLATFORMS.find((x) => x.id === platform)!;
              return (
                <div
                  key={platform}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${p.borderColor} ${p.bgColor}`}
                >
                  <span className={`animate-pulse ${p.color}`}>{p.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{p.label}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {new Date(time).toLocaleString("ja-JP")} に投稿予定
                    </p>
                  </div>
                  <svg className="animate-spin h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 投稿ボタン ── */}
      <button
        onClick={handlePost}
        disabled={isPosting || !videoFile || selectedPlatforms.length === 0}
        className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600 text-white font-semibold text-sm transition-all"
      >
        {isPosting ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            {uploadProgress < 100
              ? `アップロード中... ${uploadProgress}%`
              : "SNSに投稿中..."}
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            一括投稿
          </>
        )}
      </button>

      {/* ── エラー表示 ── */}
      {globalError && (
        <div className="mt-4 p-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-sm text-red-600 dark:text-red-400">
          {globalError}
        </div>
      )}

      {/* ── 投稿結果 ── */}
      {results.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-3">
            投稿結果
          </h2>
          <div className="flex flex-col gap-2">
            {results.map((r) => (
              <ResultBadge key={r.platform} result={r} />
            ))}
          </div>
        </section>
      )}

      {/* ── Supabase セットアップ案内 ── */}
      <details className="mt-8 group">
        <summary className="cursor-pointer text-xs text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors list-none flex items-center gap-1">
          <svg className="h-3 w-3 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          初期セットアップガイド
        </summary>
        <div className="mt-2 p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 text-xs text-gray-500 dark:text-gray-400 space-y-2 leading-relaxed">
          <p className="font-semibold text-gray-700 dark:text-gray-300">Supabase ストレージ（Instagram 用）</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Supabase Dashboard → Storage → New Bucket</li>
            <li>Bucket name: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">sns-temp</code>、Public: ON</li>
            <li>これにより Instagram が動画公開 URL にアクセスできます</li>
          </ol>
          <p className="font-semibold text-gray-700 dark:text-gray-300 pt-1">YouTube</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Google Cloud Console で既存の OAuth 2.0 クライアントを開く</li>
            <li>承認済みリダイレクト URI に <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">/api/sns-poster/youtube/callback</code> を追加</li>
          </ol>
          <p className="font-semibold text-gray-700 dark:text-gray-300 pt-1">Instagram</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Meta for Developers でアプリ作成 → Instagram Graph API 追加</li>
            <li>リダイレクト URI: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">/api/sns-poster/instagram/callback</code></li>
            <li>必要スコープ: instagram_basic, instagram_content_publish, pages_show_list</li>
            <li>Instagram Business/Creator アカウントを Facebook Page に連携</li>
            <li><code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">INSTAGRAM_CLIENT_ID</code> / <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">INSTAGRAM_CLIENT_SECRET</code> を .env.local に設定</li>
          </ol>
          <p className="font-semibold text-gray-700 dark:text-gray-300 pt-1">TikTok</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>TikTok Developers でアプリ作成 → Content Posting API を追加（審査あり）</li>
            <li>リダイレクト URI: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">/api/sns-poster/tiktok/callback</code></li>
            <li><code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">TIKTOK_CLIENT_KEY</code> / <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">TIKTOK_CLIENT_SECRET</code> を .env.local に設定</li>
          </ol>
        </div>
      </details>

      {/* ── トースト ── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium shadow-lg max-w-sm text-center">
          {toast}
        </div>
      )}
    </div>
  );
}

export default function SnsPosterPage() {
  return (
    <Suspense>
      <SnsPosterInner />
    </Suspense>
  );
}
