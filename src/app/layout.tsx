import type { Metadata } from "next";
import { Onest, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { MouseGlow } from "@/components/ui/MouseGlow";
import "./globals.css";

const onest = Onest({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Asset Management",
  description: "Portfolio asset management dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${onest.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen text-[#edeff9] font-sans">
        <MouseGlow />

        {/* 10px gradient accent bar */}
        <div className="h-[10px] w-full cm-gradient" />

        {/* Nav */}
        <nav className="relative z-50 sticky top-0 border-b border-white/[0.06] bg-[#030e18]/90 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00c389] animate-pulse-dot" />
              <span className="font-mono text-sm font-bold tracking-[0.2em] cm-gradient-text">
                ASSET_MGR
              </span>
            </div>
            <div className="flex items-center gap-8 text-xs font-medium tracking-wider text-[#787e88] uppercase">
              <Link href="/" className="hover:text-[#edeff9] transition-colors duration-200">홈</Link>
              <Link href="/portfolio" className="hover:text-[#edeff9] transition-colors duration-200">포트폴리오</Link>
            </div>
          </div>
        </nav>

        <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {children}
        </main>

        <footer className="relative z-10 border-t border-white/[0.04] bg-[#0a1c2d]/40 py-5 mt-8">
          <p className="text-center font-mono text-[10px] text-[#787e88]/40 tracking-wider">
            모든 데이터는 브라우저 LocalStorage에만 저장됩니다 · 서버 전송 없음
          </p>
        </footer>
      </body>
    </html>
  );
}
