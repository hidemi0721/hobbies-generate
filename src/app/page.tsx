import Link from "next/link";

const TOOLS = [
  {
    href: "/sketch-gen",
    emoji: "✏️",
    title: "Sketch Generator",
    description: "写真をアップロードしてラフスケッチ風のバリエーションを生成",
    tag: "Image",
    dark:  "from-slate-800 to-slate-900",
    light: "from-slate-100 to-gray-100",
    accent: { dark: "bg-slate-700", light: "bg-slate-200 text-slate-600" },
  },
  {
    href: "/concept-art",
    emoji: "🎨",
    title: "Concept Art Styler",
    description: "写真をシネマティックなコンセプトアート風に加工。光・色調・雰囲気をカスタマイズ",
    tag: "Image",
    dark:  "from-indigo-950 to-slate-900",
    light: "from-indigo-50 to-slate-100",
    accent: { dark: "bg-indigo-900", light: "bg-indigo-100 text-indigo-600" },
  },
  {
    href: "/pose-changer",
    emoji: "🕺",
    title: "Pose Changer",
    description: "キャラクター画像のポーズだけを変更。顔・服装・スタイルはそのままに",
    tag: "Image",
    dark:  "from-violet-950 to-slate-900",
    light: "from-violet-50 to-slate-100",
    accent: { dark: "bg-violet-900", light: "bg-violet-100 text-violet-600" },
  },
  {
    href: "/music-gen",
    emoji: "🎵",
    title: "Music Generator",
    description: "Sunoプロンプトを組み立て、生成した音楽から動画を作成して各種プラットフォームに配信",
    tag: "Music",
    dark:  "from-rose-950 to-slate-900",
    light: "from-rose-50 to-slate-100",
    accent: { dark: "bg-rose-900", light: "bg-rose-100 text-rose-600" },
  },
] as const;

const SNS = [
  { label: "X",         href: "#" },
  { label: "Instagram", href: "#" },
  { label: "TikTok",   href: "#" },
  { label: "YouTube",  href: "#" },
];

export default function PortalPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#080810] text-gray-900 dark:text-white transition-colors">

      {/* ── Hero ── */}
      <header className="relative overflow-hidden border-b border-gray-200 dark:border-white/[0.06] px-4 sm:px-6 py-16 sm:py-20 text-center">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[400px] w-[400px] sm:h-[500px] sm:w-[500px] rounded-full bg-indigo-400/10 dark:bg-indigo-600/10 blur-[100px] sm:blur-[120px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-2xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500 dark:text-indigo-400">
            Creative AI Tools
          </p>
          <h1 className="mb-4 text-4xl sm:text-5xl font-bold tracking-tight">Hobby Lab</h1>
          <p className="text-sm sm:text-base leading-relaxed text-gray-500 dark:text-white/50">
            趣味で作った AI ツールをまとめたポータル。
            <br className="hidden sm:block" />
            画像生成・ポーズ変換・音楽生成など、アイデアをかたちにするツール集。
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-16">

        {/* ── Tools Grid ── */}
        <section>
          <h2 className="mb-6 sm:mb-8 text-xs font-semibold uppercase tracking-[0.15em] text-gray-400 dark:text-white/30">
            Tools
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {TOOLS.map((tool) => (
              <Link key={tool.href} href={tool.href}
                className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br border p-5 sm:p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl
                  ${tool.dark} dark:border-white/[0.07] dark:hover:border-white/[0.15]
                  light:${tool.light} border-gray-200 hover:border-gray-300`}>

                {/* Gradient overlay for light mode */}
                <div className={`absolute inset-0 bg-gradient-to-br ${tool.light} dark:opacity-0 opacity-100 transition-opacity`} />
                <div className="relative z-10">
                  <span className={`mb-4 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider
                    ${tool.accent.dark} dark:text-white/70
                    text-gray-500`}
                    style={{}}
                  >
                    <span className="dark:hidden">{tool.tag}</span>
                    <span className="hidden dark:inline text-white/70">{tool.tag}</span>
                  </span>

                  <div className="mb-3 flex items-center gap-3">
                    <span className="text-2xl sm:text-3xl">{tool.emoji}</span>
                    <h3 className="text-base sm:text-lg font-bold tracking-tight text-gray-900 dark:text-white">{tool.title}</h3>
                  </div>
                  <p className="mb-4 sm:mb-5 text-sm leading-relaxed text-gray-500 dark:text-white/50">{tool.description}</p>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 dark:text-white/60 transition-colors group-hover:text-gray-700 dark:group-hover:text-white">
                    Open
                    <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── SNS ── */}
        <section className="mt-12 sm:mt-16">
          <h2 className="mb-6 sm:mb-8 text-xs font-semibold uppercase tracking-[0.15em] text-gray-400 dark:text-white/30">
            Links
          </h2>
          <div className="flex flex-wrap gap-3">
            {SNS.map((s) => {
              const isPlaceholder = s.href === "#";
              return isPlaceholder ? (
                <span key={s.label}
                  className="flex cursor-default items-center gap-2 rounded-full border border-gray-200 dark:border-white/[0.06] bg-gray-100 dark:bg-white/[0.02] px-5 py-2.5 text-sm font-medium text-gray-300 dark:text-white/25">
                  {s.label}
                </span>
              ) : (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-full border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-white/60 transition-all hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/[0.08] hover:text-gray-900 dark:hover:text-white">
                  {s.label}
                </a>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="mt-8 border-t border-gray-200 dark:border-white/[0.05] px-4 sm:px-6 py-8 text-center">
        <p className="text-xs text-gray-400 dark:text-white/20">Built with Next.js · OpenAI · Claude · Suno</p>
      </footer>
    </div>
  );
}
