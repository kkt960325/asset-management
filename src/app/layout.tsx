import type { Metadata } from "next";
import { Rajdhani, Orbitron, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { MouseGlow } from "@/components/ui/MouseGlow";
import "./globals.css";

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});
const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ASSET_MGR // J.A.R.V.I.S",
  description: "Financial Intelligence System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${rajdhani.variable} ${orbitron.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen font-sans hud-grid">
        <MouseGlow />

        {/* NAV */}
        <nav
          className="relative z-50 sticky top-0"
          style={{
            background: "rgba(0,5,8,0.94)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(0,212,255,0.12)",
            boxShadow: "0 1px 0 rgba(0,212,255,0.06), 0 4px 24px rgba(0,0,8,0.8)",
          }}
        >
          {/* Top scan line */}
          <div className="absolute top-0 inset-x-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.6), transparent)" }} />

          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <span
                  className="block w-2 h-2 rounded-full bg-[#00d4ff] animate-pulse-dot"
                  style={{ boxShadow: "0 0 8px #00d4ff, 0 0 16px rgba(0,212,255,0.4)" }}
                />
              </div>
              <div className="flex flex-col leading-none gap-0.5">
                <span className="font-display text-[9px] tracking-[0.45em] uppercase"
                  style={{ color: "rgba(0,212,255,0.4)" }}>
                  STATUS: ONLINE
                </span>
                <span
                  className="font-display text-sm font-bold tracking-[0.2em] uppercase"
                  style={{ color: "#00d4ff", textShadow: "0 0 12px rgba(0,212,255,0.5)" }}
                >
                  ASSET_MGR
                </span>
              </div>
            </div>

            {/* Nav links */}
            <div className="flex items-center gap-1">
              {[
                { href: "/", label: "홈" },
                { href: "/portfolio", label: "포트폴리오" },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="group relative px-4 py-2 font-display text-[11px] tracking-[0.25em] uppercase transition-colors duration-200"
                  style={{ color: "rgba(0,212,255,0.35)" }}
                >
                  <span className="relative z-10 group-hover:text-[#00d4ff] transition-colors duration-200">
                    [ {label} ]
                  </span>
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.1)" }}
                  />
                </Link>
              ))}
            </div>
          </div>
        </nav>

        <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {children}
        </main>

        {/* Footer */}
        <footer
          className="relative z-10 py-5 mt-8"
          style={{ borderTop: "1px solid rgba(0,212,255,0.07)" }}
        >
          <p
            className="text-center font-mono text-[9px] tracking-[0.35em] uppercase"
            style={{ color: "rgba(0,212,255,0.18)" }}
          >
            // ALL DATA STORED LOCALLY · NO SERVER TRANSMISSION · SECURE //
          </p>
        </footer>
      </body>
    </html>
  );
}
