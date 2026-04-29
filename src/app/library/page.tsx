"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

type LibraryItem = {
  id: string;
  tool: string;
  title: string;
  image_url: string;
  extra_urls: string[];
  metadata: Record<string, unknown>;
  created_at: string;
};

const TOOLS = [
  { id: "all",         label: "すべて",      emoji: "🗂️" },
  { id: "sketch",      label: "Sketch",      emoji: "✏️" },
  { id: "concept-art", label: "Concept Art", emoji: "🎨" },
  { id: "pose",        label: "Pose",        emoji: "🕺" },
  { id: "music",       label: "Music",       emoji: "🎵" },
];

const isVideo = (item: LibraryItem) => item.tool === "video";

function fmt(d: string) {
  return new Date(d).toLocaleString("ja-JP", {
    month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function ToolBadge({ tool }: { tool: string }) {
  const t = TOOLS.find(t => t.id === tool);
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/30 text-white/80 backdrop-blur-sm">
      {t?.emoji ?? "🔧"} {t?.label ?? tool}
    </span>
  );
}

export default function LibraryPage() {
  const [items,      setItems]      = useState<LibraryItem[]>([]);
  const [filter,     setFilter]     = useState("all");
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState<LibraryItem | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting,   setDeleting]   = useState(false);

  const load = useCallback(async (tool: string) => {
    setLoading(true);
    try {
      const url = tool === "all" ? "/api/library" : `/api/library?tool=${tool}`;
      const res  = await fetch(url);
      const data = await res.json();
      if (data.items) setItems(data.items);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(filter); }, [load, filter]);

  const handleDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/library/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, tool: selected.tool }),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== selected.id));
        setSelected(null);
        setConfirmDel(false);
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">

      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Library</h1>

          {/* フィルタータブ */}
          <div className="flex gap-1.5 flex-wrap">
            {TOOLS.map(t => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === t.id
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                <span>{t.emoji}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
            <span className="text-6xl">📭</span>
            <p className="text-gray-400 dark:text-gray-600 text-sm">
              {filter === "all" ? "まだ保存されたアイテムがありません" : `${TOOLS.find(t => t.id === filter)?.label} のアイテムがありません`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map(item => (
              <button
                key={item.id}
                onClick={() => setSelected(item)}
                className="group relative aspect-square rounded-2xl overflow-hidden bg-gray-200 dark:bg-gray-800 shadow-sm hover:shadow-lg transition-shadow focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {isVideo(item) ? (
                  <video
                    src={item.image_url}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    muted playsInline preload="metadata"
                  />
                ) : item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={item.title}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-4xl">🎵</div>
                )}
                {/* ホバーオーバーレイ */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3 text-left">
                  <p className="text-white text-xs font-medium line-clamp-2">{item.title || "無題"}</p>
                  <p className="text-white/60 text-[10px] mt-0.5">{fmt(item.created_at)}</p>
                </div>
                {/* ツールバッジ */}
                <div className="absolute top-2 left-2">
                  <ToolBadge tool={item.tool} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 詳細モーダル */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => { setSelected(null); setConfirmDel(false); }}
        >
          <div
            className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* 閉じるボタン */}
            <button
              onClick={() => { setSelected(null); setConfirmDel(false); }}
              className="absolute top-3 right-3 z-10 p-2 rounded-xl bg-black/20 hover:bg-black/40 text-white transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* メイン画像 / 動画 */}
            {selected.image_url && (
              <div className="relative w-full rounded-t-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                {isVideo(selected) ? (
                  <video
                    src={selected.image_url}
                    controls
                    playsInline
                    className="w-full max-h-96 object-contain"
                  />
                ) : (
                  <div className="aspect-square">
                    <Image
                      src={selected.image_url}
                      alt={selected.title}
                      fill
                      sizes="(max-width: 672px) 100vw, 672px"
                      className="object-contain"
                    />
                  </div>
                )}
              </div>
            )}

            {/* 情報 */}
            <div className="p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-base">
                    {selected.title || "無題"}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">{fmt(selected.created_at)}</p>
                </div>
                <ToolBadge tool={selected.tool} />
              </div>

              {/* メタデータ */}
              {selected.metadata && Object.keys(selected.metadata).length > 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-xl p-3 mb-4 space-y-1">
                  {Object.entries(selected.metadata).map(([k, v]) => (
                    typeof v === "string" && v && (
                      <p key={k}><span className="text-gray-400">{k}:</span> {v}</p>
                    )
                  ))}
                </div>
              )}

              {/* サブ画像 */}
              {selected.extra_urls.filter(Boolean).length > 1 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-500 mb-2">その他の画像</p>
                  <div className="grid grid-cols-3 gap-2">
                    {selected.extra_urls.filter(Boolean).map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                        className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 hover:opacity-80 transition-opacity">
                        <Image src={url} alt={`extra-${i}`} fill sizes="200px" className="object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* ダウンロード */}
              {selected.image_url && (
                <a
                  href={selected.image_url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  ダウンロード
                </a>
              )}

              {/* 削除 */}
              {!confirmDel ? (
                <button
                  onClick={() => setConfirmDel(true)}
                  className="mt-2 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-sm font-medium transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  削除
                </button>
              ) : (
                <div className="mt-2 p-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
                  <p className="text-sm text-red-600 dark:text-red-400 text-center mb-2">本当に削除しますか？</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmDel(false)}
                      className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
                    >
                      {deleting ? "削除中..." : "削除する"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
