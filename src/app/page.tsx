import Link from "next/link";
import { FadeUp } from "@/components/ui/FadeUp";

const MODULES = [
  {
    id: "01",
    label: "REAL-TIME FEEDS",
    sub: "실시간 시세",
    desc: "주식·코인·금·원자재 가격 자동 조회. 갱신 한 번으로 전체 포트폴리오 업데이트.",
    accent: "0,212,255",
  },
  {
    id: "02",
    label: "REBALANCE ALERT",
    sub: "리밸런싱 알림",
    desc: "목표 비중 괴리 발생 시 즉시 알림. 매수·매도 금액을 자동으로 산출.",
    accent: "255,102,0",
  },
  {
    id: "03",
    label: "TAX SIMULATION",
    sub: "세금 간이 추정",
    desc: "카테고리별 양도세·배당세 자동 계산. KRX 금현물 비과세 혜택 포함.",
    accent: "255,170,0",
  },
  {
    id: "04",
    label: "LOCAL STORAGE",
    sub: "로컬 전용 저장",
    desc: "서버 없음. 로그인 없음. 모든 데이터는 브라우저에만 저장됩니다.",
    accent: "0,255,136",
  },
];

export default function Home() {
  return (
    <div className="relative flex flex-col gap-20 min-h-[78vh] pt-8 pb-20">

      {/* Atmospheric radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 50% -5%, rgba(0,80,180,0.08) 0%, transparent 70%)",
        }}
      />

      {/* ── HERO ── */}
      <div className="relative flex flex-col gap-7 animate-fade-in-up max-w-5xl">

        {/* Status bar */}
        <div className="flex items-center gap-4">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5"
            style={{ border: "1px solid rgba(0,212,255,0.22)", background: "rgba(0,212,255,0.04)" }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] animate-pulse-dot"
              style={{ boxShadow: "0 0 6px #00d4ff" }}
            />
            <span className="font-display text-[9px] tracking-[0.45em] uppercase" style={{ color: "rgba(0,212,255,0.7)" }}>
              SYSTEM ONLINE
            </span>
          </div>
          <div
            className="h-px flex-1 max-w-xs"
            style={{ background: "linear-gradient(90deg, rgba(0,212,255,0.2), transparent)" }}
          />
          <span className="font-mono text-[9px] tracking-widest" style={{ color: "rgba(0,212,255,0.2)" }}>
            J.A.R.V.I.S — FINANCIAL MODULE v3.7
          </span>
        </div>

        {/* Main headline */}
        <div className="flex flex-col">
          <h1
            className="font-display font-black uppercase leading-[0.86]"
            style={{
              fontSize: "clamp(3.2rem, 9vw, 8rem)",
              color: "#b8e0f0",
              letterSpacing: "-0.02em",
            }}
          >
            FINANCIAL
          </h1>
          <h1
            className="font-display font-black uppercase leading-[0.86] animate-data-flicker"
            style={{
              fontSize: "clamp(3.2rem, 9vw, 8rem)",
              color: "#00d4ff",
              letterSpacing: "-0.02em",
              textShadow: "0 0 40px rgba(0,212,255,0.35), 0 0 80px rgba(0,212,255,0.12)",
            }}
          >
            INTELLIGENCE
          </h1>
          <h1
            className="font-display font-black uppercase leading-[0.86]"
            style={{
              fontSize: "clamp(3.2rem, 9vw, 8rem)",
              color: "#b8e0f0",
              letterSpacing: "-0.02em",
            }}
          >
            SYSTEM
          </h1>
        </div>

        {/* Separator */}
        <div className="flex items-center gap-4">
          <div className="h-px w-12" style={{ background: "rgba(0,212,255,0.4)" }} />
          <p className="font-mono text-[11px] tracking-widest uppercase" style={{ color: "rgba(0,212,255,0.3)" }}>
            주식 · 코인 · 금 · 부동산 · 현금 — ALL ASSETS ONE INTERFACE
          </p>
        </div>

        {/* CTA */}
        <div className="flex items-center gap-6 mt-1">
          <Link
            href="/portfolio"
            className="group relative inline-flex items-center gap-3 px-8 py-4 font-display text-sm font-bold tracking-[0.25em] uppercase overflow-hidden"
            style={{
              border: "1px solid rgba(0,212,255,0.45)",
              color: "#00d4ff",
              background: "rgba(0,212,255,0.03)",
              boxShadow: "0 0 24px rgba(0,212,255,0.08), inset 0 0 20px rgba(0,212,255,0.03)",
            }}
          >
            <div
              className="absolute inset-0 translate-x-[-101%] group-hover:translate-x-0 transition-transform duration-500 ease-out"
              style={{ background: "rgba(0,212,255,0.08)" }}
            />
            <span className="relative z-10">INITIALIZE PORTFOLIO</span>
            <svg
              className="relative z-10 w-4 h-4 transition-transform group-hover:translate-x-1 duration-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
          <span className="font-mono text-[9px] tracking-[0.35em] uppercase" style={{ color: "rgba(0,212,255,0.15)" }}>
            // NO LOGIN REQUIRED
          </span>
        </div>
      </div>

      {/* ── MODULES GRID ── */}
      <div>
        <div className="flex items-center gap-4 mb-5">
          <span
            className="font-display text-[9px] tracking-[0.45em] uppercase"
            style={{ color: "rgba(0,212,255,0.35)" }}
          >
            SYSTEM MODULES
          </span>
          <div
            className="h-px flex-1"
            style={{ background: "linear-gradient(90deg, rgba(0,212,255,0.15), transparent)" }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {MODULES.map((mod, i) => (
            <FadeUp key={mod.id} delay={i * 0.09}>
              <div
                className="relative h-full p-5 group cursor-default overflow-hidden"
                style={{
                  background: "rgba(0,8,18,0.92)",
                  border: `1px solid rgba(${mod.accent},0.18)`,
                }}
              >
                {/* Corner brackets */}
                <div className="absolute top-0 left-0 w-3 h-3 z-10"
                  style={{ borderTop: `1px solid rgba(${mod.accent},0.6)`, borderLeft: `1px solid rgba(${mod.accent},0.6)` }} />
                <div className="absolute top-0 right-0 w-3 h-3 z-10"
                  style={{ borderTop: `1px solid rgba(${mod.accent},0.6)`, borderRight: `1px solid rgba(${mod.accent},0.6)` }} />
                <div className="absolute bottom-0 left-0 w-3 h-3 z-10"
                  style={{ borderBottom: `1px solid rgba(${mod.accent},0.6)`, borderLeft: `1px solid rgba(${mod.accent},0.6)` }} />
                <div className="absolute bottom-0 right-0 w-3 h-3 z-10"
                  style={{ borderBottom: `1px solid rgba(${mod.accent},0.6)`, borderRight: `1px solid rgba(${mod.accent},0.6)` }} />

                {/* Hover inner glow */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ boxShadow: `inset 0 0 40px rgba(${mod.accent},0.06)` }}
                />

                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px]" style={{ color: `rgba(${mod.accent},0.45)` }}>
                      [{mod.id}]
                    </span>
                    <span
                      className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
                      style={{
                        background: `rgba(${mod.accent},1)`,
                        boxShadow: `0 0 6px rgba(${mod.accent},0.9)`,
                      }}
                    />
                  </div>

                  <div>
                    <p
                      className="font-display text-xs font-bold tracking-[0.2em] uppercase"
                      style={{ color: `rgba(${mod.accent},1)` }}
                    >
                      {mod.label}
                    </p>
                    <p className="font-sans text-[11px] mt-0.5" style={{ color: `rgba(${mod.accent},0.5)` }}>
                      {mod.sub}
                    </p>
                  </div>

                  <p
                    className="text-[11px] leading-relaxed font-sans"
                    style={{ color: "rgba(184,224,240,0.45)" }}
                  >
                    {mod.desc}
                  </p>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </div>
  );
}
