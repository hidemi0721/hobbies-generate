"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type Note = {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
};

export default function NotesPage() {
  const [notes,       setNotes]       = useState<Note[]>([]);
  const [selectedId,  setSelectedId]  = useState<string | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [showList,    setShowList]    = useState(true); // モバイル用切り替え
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected = notes.find(n => n.id === selectedId) ?? null;

  // ─── 読み込み ───────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const res  = await fetch("/api/notes");
      const data = await res.json();
      if (data.notes) setNotes(data.notes);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ─── 新規作成 ──────────────────────────────────────
  const createNote = async () => {
    const res  = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "新しいメモ", content: "" }),
    });
    const data = await res.json();
    if (data.note) {
      setNotes(prev => [data.note, ...prev]);
      setSelectedId(data.note.id);
      setShowList(false);
    }
  };

  // ─── 自動保存（デバウンス） ────────────────────────
  const scheduleUpdate = useCallback((id: string, field: "title" | "content", value: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, [field]: value, updated_at: new Date().toISOString() } : n));

    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = setTimeout(async () => {
      try {
        await fetch(`/api/notes/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: value }),
        });
      } finally { setSaving(false); }
    }, 800);
  }, []);

  // ─── ピン留め ──────────────────────────────────────
  const togglePin = async (id: string, pinned: boolean) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, pinned: !pinned } : n));
    await fetch(`/api/notes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !pinned }),
    });
    load();
  };

  // ─── 削除 ──────────────────────────────────────────
  const deleteNote = async (id: string) => {
    if (!confirm("このメモを削除しますか？")) return;
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
    setNotes(prev => prev.filter(n => n.id !== id));
    if (selectedId === id) { setSelectedId(null); setShowList(true); }
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex h-screen bg-white dark:bg-gray-950 overflow-hidden">

      {/* ── ノートリスト ── */}
      <div className={`
        flex flex-col border-r border-gray-200 dark:border-gray-800
        w-full sm:w-72 lg:w-80 shrink-0
        ${showList ? "flex" : "hidden sm:flex"}
      `}>
        {/* ヘッダー：モバイルは右上ハンバーガーを避けるため pr-14 */}
        <div className="flex items-center justify-between px-4 pr-14 sm:pr-4 py-4 border-b border-gray-100 dark:border-gray-800">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">メモ</h1>
          <button onClick={createNote}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            新規
          </button>
        </div>

        {/* リスト */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 flex flex-col gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ))}
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-center px-4">
              <span className="text-3xl">📝</span>
              <p className="text-sm text-gray-400 dark:text-gray-500">メモがありません</p>
              <button onClick={createNote}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                最初のメモを作成
              </button>
            </div>
          ) : (
            <div className="p-2 flex flex-col gap-1">
              {notes.map(note => (
                <button key={note.id} onClick={() => { setSelectedId(note.id); setShowList(false); }}
                  className={`w-full text-left px-3 py-3 rounded-xl transition-colors group ${
                    selectedId === note.id
                      ? "bg-indigo-50 dark:bg-indigo-950/60"
                      : "hover:bg-gray-50 dark:hover:bg-gray-900"
                  }`}>
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <p className={`text-sm font-medium truncate flex-1 ${
                      selectedId === note.id ? "text-indigo-700 dark:text-indigo-300" : "text-gray-800 dark:text-gray-200"
                    }`}>
                      {note.pinned && <span className="mr-1 text-amber-500">📌</span>}
                      {note.title || "無題"}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-600 truncate mb-1">
                    {note.content.split("\n")[0] || "内容なし"}
                  </p>
                  <p className="text-[10px] text-gray-300 dark:text-gray-700">{fmt(note.updated_at)}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── エディター ── */}
      <div className={`flex-1 min-w-0 flex flex-col ${!showList || selected ? "flex" : "hidden sm:flex"}`}>
        {selected ? (
          <>
            {/* エディターヘッダー */}
            <div className="flex items-center gap-2 px-4 sm:px-6 pr-14 sm:pr-6 py-3 border-b border-gray-100 dark:border-gray-800">
              {/* モバイル：リストに戻る */}
              <button onClick={() => setShowList(true)}
                className="sm:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="flex-1" />

              {saving && <p className="text-xs text-gray-400 dark:text-gray-600">保存中...</p>}

              {/* ピン留め */}
              <button onClick={() => togglePin(selected.id, selected.pinned)}
                title={selected.pinned ? "ピン解除" : "ピン留め"}
                className={`p-2 rounded-lg transition-colors ${selected.pinned ? "text-amber-500 bg-amber-50 dark:bg-amber-950/40" : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}>
                📌
              </button>

              {/* 削除 */}
              <button onClick={() => deleteNote(selected.id)}
                className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            {/* タイトル */}
            <input
              value={selected.title}
              onChange={e => scheduleUpdate(selected.id, "title", e.target.value)}
              placeholder="タイトル"
              className="px-4 sm:px-6 pt-5 pb-2 text-xl font-bold bg-transparent text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-700 focus:outline-none"
            />

            {/* タイムスタンプ */}
            <p className="px-4 sm:px-6 pb-3 text-xs text-gray-300 dark:text-gray-700">
              更新: {fmt(selected.updated_at)} · 作成: {fmt(selected.created_at)}
            </p>

            {/* 本文 */}
            <textarea
              value={selected.content}
              onChange={e => scheduleUpdate(selected.id, "content", e.target.value)}
              placeholder="メモを入力..."
              className="flex-1 px-4 sm:px-6 pb-6 resize-none bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-300 dark:placeholder-gray-700 focus:outline-none leading-relaxed"
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
            <span className="text-5xl">📝</span>
            <p className="text-gray-400 dark:text-gray-600 text-sm">左のリストからメモを選択するか、新しいメモを作成してください</p>
            <button onClick={createNote}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors">
              + 新しいメモ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
