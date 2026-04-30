import type { Metadata } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";
import NavUser from "@/components/NavUser";
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
      <body className="min-h-screen bg-[#070b12] text-[#e2e8f8] font-sans">
        <SessionProviderWrapper>
          {/* ── Nav ───────────────────────────────────────────────── */}
          <nav className="sticky top-0 z-50 border-b border-[#1a2540] bg-[#070b12]/90 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse-dot" />
                <span className="font-mono text-sky-400 font-semibold tracking-widest text-sm">
                  ASSET_MGR
                </span>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-8 text-xs font-medium tracking-wider text-[#8392b0] uppercase">
                  <a href="/" className="hover:text-sky-400 transition-colors">홈</a>
                  <a href="/portfolio" className="hover:text-sky-400 transition-colors">포트폴리오</a>
                </div>
                <NavUser />
              </div>
            </div>
          </nav>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">{children}</main>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
