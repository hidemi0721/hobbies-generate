"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const NAV_ITEMS = [
  { href: "/",            label: "Portal",             emoji: "🏠" },
  { href: "/sketch-gen",  label: "Sketch Generator",   emoji: "✏️" },
  { href: "/concept-art", label: "Concept Art Styler",  emoji: "🎨" },
  { href: "/pose-changer",label: "Pose Changer",        emoji: "🕺" },
  { href: "/music-gen",   label: "Music Generator",     emoji: "🎵" },
  { href: "/sns-poster",  label: "SNS Bulk Poster",     emoji: "📤" },
];

const UTILITY_ITEMS = [
  { href: "/library", label: "Library", emoji: "📚" },
  { href: "/notes",   label: "Notes",   emoji: "📝" },
];

const AI_LINKS = [
  { href: "https://gemini.google.com", label: "Gemini",  emoji: "♊" },
  { href: "https://chatgpt.com",       label: "ChatGPT", emoji: "🤖" },
  { href: "https://claude.ai",         label: "Claude",  emoji: "✦"  },
];

const MUSIC_LINKS = [
  { href: "https://suno.com", label: "Suno", emoji: "🎼" },
];

const DIST_LINKS = [
  { href: "https://frekul.com/",             label: "Frekul",         emoji: "🎧" },
  { href: "https://dova-s.jp/make/",         label: "DOVA-SYNDROME",  emoji: "🎮" },
  { href: "https://maou.audio/form/",        label: "魔王魂",          emoji: "👹" },
  { href: "https://pixabay.com/music/upload/", label: "Pixabay Music", emoji: "🌐" },
];

const STUDIO_LINKS = [
  { href: "https://www.tiktok.com/tiktokstudio/upload",  label: "TikTok Studio",  emoji: "🎵" },
  { href: "https://studio.youtube.com",                   label: "YouTube Studio", emoji: "▶️" },
  { href: "https://www.instagram.com/",                   label: "Instagram",      emoji: "📸" },
];

const SNS_LINKS = [
  { href: "https://x.com/antinomy7777",             label: "X",         emoji: "𝕏" },
  { href: "https://www.instagram.com/antinomy7777", label: "Instagram", emoji: "📸" },
  { href: "https://www.tiktok.com/@lumi_antinomy_zzz", label: "TikTok", emoji: "🎵" },
  { href: "https://www.youtube.com/@lumi_antinomy_zzz", label: "YouTube", emoji: "▶️" },
];

function ExtLink({ href, label, emoji, onClick }: { href: string; label: string; emoji: string; onClick: () => void }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium mb-0.5 transition-all text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
    >
      <span className="text-base leading-none w-5 text-center shrink-0">{emoji}</span>
      <span className="flex-1 truncate">{label}</span>
      <svg className="h-3 w-3 opacity-30 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">
      {label}
    </p>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const close = () => setOpen(false);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <>
      {/* ── モバイル ハンバーガーボタン ── */}
      <button
        onClick={() => setOpen(true)}
        aria-label="メニューを開く"
        className="lg:hidden fixed top-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-800"
      >
        <svg className="h-5 w-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* ── モバイル オーバーレイ ── */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={close} />
      )}

      {/* ── サイドバー本体 ── */}
      <aside
        className={`
          fixed lg:sticky top-0 z-40
          h-screen w-56 shrink-0
          flex flex-col overflow-hidden
          bg-white dark:bg-gray-900
          border-gray-200 dark:border-gray-800
          transition-transform duration-200
          right-0 lg:left-0 lg:right-auto
          border-l lg:border-l-0 lg:border-r
          ${open ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
        `}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <Link href="/" onClick={close} className="group">
            <p className="font-bold text-base text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              Hobby Lab
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Creative AI Tools</p>
          </Link>
          <button
            onClick={close}
            className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ナビゲーション（スクロール可能） */}
        <nav className="flex-1 overflow-y-auto p-2 pb-4">

          {/* Tools */}
          <SectionLabel label="Tools" />
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium mb-0.5 transition-all ${
                  isActive
                    ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <span className="text-base leading-none w-5 text-center shrink-0">{item.emoji}</span>
                <span className="flex-1 truncate">{item.label}</span>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />}
              </Link>
            );
          })}

          {/* Workspace */}
          <SectionLabel label="Workspace" />
          {UTILITY_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium mb-0.5 transition-all ${
                  isActive
                    ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <span className="text-base leading-none w-5 text-center shrink-0">{item.emoji}</span>
                <span className="flex-1 truncate">{item.label}</span>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />}
              </Link>
            );
          })}

          {/* AI Chat */}
          <SectionLabel label="AI Chat" />
          {AI_LINKS.map((item) => (
            <ExtLink key={item.href} {...item} onClick={close} />
          ))}

          {/* Music */}
          <SectionLabel label="Music" />
          {MUSIC_LINKS.map((item) => (
            <ExtLink key={item.href} {...item} onClick={close} />
          ))}

          {/* 配信 */}
          <SectionLabel label="配信" />
          {DIST_LINKS.map((item) => (
            <ExtLink key={item.href} {...item} onClick={close} />
          ))}

          {/* 投稿 */}
          <SectionLabel label="投稿" />
          {STUDIO_LINKS.map((item) => (
            <ExtLink key={item.href} {...item} onClick={close} />
          ))}

          {/* SNS */}
          <SectionLabel label="SNS" />
          {SNS_LINKS.map((item) =>
            item.href === "#" ? (
              <span
                key={item.label}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium mb-0.5 text-gray-300 dark:text-gray-700 cursor-default"
              >
                <span className="text-base leading-none w-5 text-center shrink-0">{item.emoji}</span>
                <span className="flex-1 truncate">{item.label}</span>
              </span>
            ) : (
              <ExtLink key={item.href} {...item} onClick={close} />
            )
          )}
        </nav>

        {/* フッター（テーマ切替・モバイルのみ） */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <button
            onClick={toggleTheme}
            aria-label="テーマ切り替え"
            className="lg:hidden flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors w-full"
          >
            {dark ? (
              <svg className="h-5 w-5 text-yellow-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="5" />
                <path strokeLinecap="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            ) : (
              <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
            <span>{dark ? "ライトモード" : "ダークモード"}</span>
          </button>
          <p className="text-[10px] text-gray-300 dark:text-gray-700 text-center mt-2">
            Built with Next.js · Claude · OpenAI
          </p>
        </div>
      </aside>
    </>
  );
}
