"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/",            label: "Portal",            emoji: "🏠" },
  { href: "/sketch-gen",  label: "Sketch Generator",  emoji: "✏️" },
  { href: "/concept-art", label: "Concept Art Styler", emoji: "🎨" },
  { href: "/pose-changer",label: "Pose Changer",       emoji: "🕺" },
  { href: "/music-gen",   label: "Music Generator",    emoji: "🎵" },
];

const UTILITY_ITEMS = [
  { href: "/library", label: "Library",  emoji: "📚" },
  { href: "/notes",   label: "Notes",    emoji: "📝" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <>
      {/* ── モバイル ハンバーガーボタン ── */}
      <button
        onClick={() => setOpen(true)}
        aria-label="メニューを開く"
        className="lg:hidden fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-800"
      >
        <svg className="h-5 w-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* ── モバイル オーバーレイ ── */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={close}
        />
      )}

      {/* ── サイドバー本体 ── */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-40
          h-screen w-56 shrink-0
          flex flex-col overflow-hidden
          bg-white dark:bg-gray-900
          border-r border-gray-200 dark:border-gray-800
          transition-transform duration-200
          ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-gray-100 dark:border-gray-800">
          <Link href="/" onClick={close} className="group">
            <p className="font-bold text-base text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              Hobby Lab
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Creative AI Tools</p>
          </Link>
          {/* モバイル 閉じるボタン */}
          <button
            onClick={close}
            className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ナビゲーション */}
        <nav className="flex-1 overflow-y-auto p-2">
          <p className="px-3 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">
            Tools
          </p>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium mb-0.5 transition-all
                  ${isActive
                    ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                  }
                `}
              >
                <span className="text-base leading-none">{item.emoji}</span>
                <span className="flex-1 truncate">{item.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                )}
              </Link>
            );
          })}

          <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">
            Workspace
          </p>
          {UTILITY_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium mb-0.5 transition-all
                  ${isActive
                    ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                  }
                `}
              >
                <span className="text-base leading-none">{item.emoji}</span>
                <span className="flex-1 truncate">{item.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* フッター */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
          <p className="text-[10px] text-gray-300 dark:text-gray-700 text-center">
            Built with Next.js · Claude · OpenAI
          </p>
        </div>
      </aside>
    </>
  );
}
