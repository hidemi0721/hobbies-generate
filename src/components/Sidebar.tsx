"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

// ── SVG ロゴ ────────────────────────────────────────────────────────────────

const IconYouTube = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const IconInstagram = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const IconTikTok = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.21 8.21 0 0 0 4.79 1.52V6.77a4.85 4.85 0 0 1-1.02-.08z" />
  </svg>
);

const IconX = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const IconOpenAI = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.032.067L9.73 19.95a4.5 4.5 0 0 1-6.13-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
  </svg>
);

const IconGemini = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
    <path d="M12 0C8.74 5.5 6.5 8.74 0 12c6.5 3.26 8.74 6.5 12 12 3.26-5.5 5.5-8.74 12-12C18.5 8.74 16.26 5.5 12 0z" />
  </svg>
);

// Claude は ✦ テキストをそのまま利用（公式ブランドマーク）

// ── リンク定義 ──────────────────────────────────────────────────────────────

type LinkItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const NAV_ITEMS = [
  { href: "/",             label: "Portal",            icon: "🏠" },
  { href: "/sketch-gen",   label: "Sketch Generator",  icon: "✏️" },
  { href: "/concept-art",  label: "Concept Art Styler", icon: "🎨" },
  { href: "/pose-changer", label: "Pose Changer",       icon: "🕺" },
  { href: "/music-gen",    label: "Music Generator",    icon: "🎵" },
  { href: "/sns-poster",   label: "SNS Bulk Poster",    icon: "📤" },
];

const UTILITY_ITEMS = [
  { href: "/library", label: "Library", icon: "📚" },
  { href: "/notes",   label: "Notes",   icon: "📝" },
];

const AI_LINKS: LinkItem[] = [
  { href: "https://gemini.google.com", label: "Gemini",  icon: <IconGemini /> },
  { href: "https://chatgpt.com",       label: "ChatGPT", icon: <IconOpenAI /> },
  { href: "https://claude.ai",         label: "Claude",  icon: <span className="text-sm leading-none">✦</span> },
];

const MUSIC_LINKS: LinkItem[] = [
  { href: "https://suno.com", label: "Suno", icon: "🎼" },
];

const DIST_LINKS: LinkItem[] = [
  { href: "https://frekul.com/",              label: "Frekul",        icon: "🎧" },
  { href: "https://dova-s.jp/make/",          label: "DOVA-SYNDROME", icon: "🎮" },
  { href: "https://maou.audio/form/",         label: "魔王魂",         icon: "👹" },
  { href: "https://pixabay.com/music/upload/", label: "Pixabay Music", icon: "🌐" },
];

const STUDIO_LINKS: LinkItem[] = [
  { href: "https://www.tiktok.com/tiktokstudio/upload", label: "TikTok Studio",  icon: <IconTikTok /> },
  { href: "https://studio.youtube.com",                  label: "YouTube Studio", icon: <IconYouTube /> },
  { href: "https://www.instagram.com/",                  label: "Instagram",      icon: <IconInstagram /> },
];

const SNS_LINKS: LinkItem[] = [
  { href: "https://x.com/antinomy7777",              label: "X",         icon: <IconX /> },
  { href: "https://www.instagram.com/antinomy7777",  label: "Instagram", icon: <IconInstagram /> },
  { href: "https://www.tiktok.com/@lumi_antinomy_zzz", label: "TikTok", icon: <IconTikTok /> },
  { href: "https://www.youtube.com/@lumi_antinomy_zzz", label: "YouTube", icon: <IconYouTube /> },
];

// ── コンポーネント ────────────────────────────────────────────────────────────

function IconSlot({ icon }: { icon: React.ReactNode }) {
  return (
    <span className="flex items-center justify-center w-5 h-5 shrink-0">
      {icon}
    </span>
  );
}

function ExtLink({ href, label, icon, onClick }: LinkItem & { onClick: () => void }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium mb-0.5 transition-all text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
    >
      <IconSlot icon={icon} />
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
  const [dark, setDark] = useState(() => {
    // Client component: guard for any server pre-render.
    if (typeof document === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });

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
        className="md:hidden fixed top-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-800"
      >
        <svg className="h-5 w-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* ── モバイル オーバーレイ ── */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={close} />
      )}

      {/* ── サイドバー本体 ── */}
      <aside
        className={`
          fixed md:sticky top-0 z-40
          h-screen w-56 shrink-0
          flex flex-col overflow-hidden
          bg-white dark:bg-gray-900
          border-gray-200 dark:border-gray-800
          transition-transform duration-200
          right-0 md:left-0 md:right-auto
          border-l md:border-l-0 md:border-r
          ${open ? "translate-x-0" : "translate-x-full md:translate-x-0"}
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
            className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
                <IconSlot icon={item.icon} />
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
                <IconSlot icon={item.icon} />
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
          {SNS_LINKS.map((item) => (
            <ExtLink key={item.href} {...item} onClick={close} />
          ))}
        </nav>

        {/* フッター（テーマ切替・モバイルのみ） */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <button
            onClick={toggleTheme}
            aria-label="テーマ切り替え"
            className="md:hidden flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors w-full"
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
