import type { Metadata } from "next";
import "./globals.css";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sidebar } from "@/components/Sidebar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Hobby Lab",
  description: "趣味で作った AI ツールをまとめたポータル",
  verification: {
    google: "CkzQ74WrU8j3zb23ifyUy6X9n0ow7gO9DhnaBBZoR50",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <head>
        {/* ダークモード設定（フラッシュ防止） */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(t===null&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="flex min-h-screen bg-white dark:bg-gray-950">
        <Sidebar />
        <div className="flex-1 min-w-0 relative flex flex-col min-h-screen">
          <ThemeToggle />
          <div className="flex-1">{children}</div>
          <Footer />
        </div>
      </body>
    </html>
  );
}
