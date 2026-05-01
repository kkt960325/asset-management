import type { Metadata } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { MouseGlow } from "@/components/ui/MouseGlow";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Asset Management",
  description: "Portfolio asset management dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${manrope.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-[#09090b] text-zinc-100 font-sans">
        {/* 마우스 따라오는 Glow 레이어 */}
        <MouseGlow />

        {/* Nav */}
        <nav className="relative z-50 sticky top-0 border-b border-zinc-800/60 bg-[#09090b]/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse-dot" />
              <span className="font-mono text-sky-400 font-semibold tracking-[0.2em] text-sm">
                ASSET_MGR
              </span>
            </div>
            <div className="flex items-center gap-8 text-xs font-medium tracking-wider text-zinc-500 uppercase">
              <Link href="/" className="hover:text-zinc-200 transition-colors">홈</Link>
              <Link href="/portfolio" className="hover:text-zinc-200 transition-colors">포트폴리오</Link>
            </div>
          </div>
        </nav>

        <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {children}
        </main>

        {/* localStorage 안내 */}
        <footer className="relative z-10 border-t border-zinc-800/40 py-4 mt-8">
          <p className="text-center font-mono text-[10px] text-zinc-700 tracking-wider">
            모든 데이터는 브라우저 LocalStorage에만 저장됩니다 · 서버 전송 없음
          </p>
        </footer>
      </body>
    </html>
  );
}
