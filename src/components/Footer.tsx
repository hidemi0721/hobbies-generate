const FOOTER_SECTIONS = [
  {
    label: "Tools",
    links: [
      { href: "/",             label: "Portal" },
      { href: "/sketch-gen",   label: "Sketch Generator" },
      { href: "/concept-art",  label: "Concept Art Styler" },
      { href: "/pose-changer", label: "Pose Changer" },
      { href: "/music-gen",    label: "Music Generator" },
      { href: "/sns-poster",   label: "SNS Bulk Poster" },
    ],
  },
  {
    label: "Workspace",
    links: [
      { href: "/library", label: "Library" },
      { href: "/notes",   label: "Notes" },
    ],
  },
  {
    label: "AI Chat",
    links: [
      { href: "https://gemini.google.com", label: "Gemini" },
      { href: "https://chatgpt.com",       label: "ChatGPT" },
      { href: "https://claude.ai",         label: "Claude" },
    ],
  },
  {
    label: "Music",
    links: [
      { href: "https://suno.com", label: "Suno" },
    ],
  },
  {
    label: "配信",
    links: [
      { href: "https://frekul.com/",               label: "Frekul" },
      { href: "https://dova-s.jp/make/",           label: "DOVA-SYNDROME" },
      { href: "https://maou.audio/form/",          label: "魔王魂" },
      { href: "https://pixabay.com/music/upload/", label: "Pixabay Music" },
    ],
  },
  {
    label: "投稿",
    links: [
      { href: "https://www.tiktok.com/tiktokstudio/upload", label: "TikTok Studio" },
      { href: "https://studio.youtube.com",                  label: "YouTube Studio" },
      { href: "https://www.instagram.com/",                  label: "Instagram" },
    ],
  },
  {
    label: "SNS",
    links: [
      { href: "https://x.com/antinomy7777",             label: "X" },
      { href: "https://www.instagram.com/antinomy7777", label: "Instagram" },
      { href: "https://www.tiktok.com/@lumi_antinomy_zzz", label: "TikTok" },
      { href: "https://www.youtube.com/@lumi_antinomy_zzz", label: "YouTube" },
    ],
  },
];

function isExternal(href: string) {
  return href.startsWith("http");
}

export function Footer() {
  return (
    <footer className="border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-6 py-10 mt-auto">
      <div className="max-w-4xl mx-auto">
        {/* グリッド */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
          {FOOTER_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-2">
                {section.label}
              </p>
              <ul className="flex flex-col gap-1">
                {section.links.map((link) => {
                  const external = isExternal(link.href);
                  const placeholder = link.href === "#";
                  if (placeholder) {
                    return (
                      <li key={link.label}>
                        <span className="text-xs text-gray-300 dark:text-gray-700 cursor-default">
                          {link.label}
                        </span>
                      </li>
                    );
                  }
                  return (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        {link.label}
                        {external && (
                          <svg className="inline-block ml-0.5 h-2.5 w-2.5 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        )}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* ボトムライン */}
        <div className="border-t border-gray-100 dark:border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-600">Hobby Lab</p>
          <p className="text-xs text-gray-300 dark:text-gray-700">
            Built with Next.js · Claude · OpenAI · Gemini
          </p>
        </div>
      </div>
    </footer>
  );
}
