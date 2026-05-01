import Link from "next/link";

export default function Home() {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-[76vh] gap-10 text-center px-4">

      {/* 배경 그리드 */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(#a1a1aa 1px, transparent 1px), linear-gradient(90deg, #a1a1aa 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative flex flex-col items-center gap-6 animate-fade-in-up">

        {/* 라벨 */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 backdrop-blur">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
          <span className="font-mono text-[11px] text-zinc-400 tracking-widest uppercase">
            Open Source · Client Only
          </span>
        </div>

        {/* 헤로 타이틀 */}
        <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-zinc-50 leading-[1.05]">
          포트폴리오<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">
            대시보드
          </span>
        </h1>

        <p className="text-zinc-400 text-base sm:text-lg max-w-md leading-relaxed">
          주식·코인·금·부동산을 한 화면에서.<br />
          로그인 없이, 서버 없이, 브라우저에서 바로.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
          <Link
            href="/portfolio"
            className="group flex items-center gap-2 px-6 py-3 rounded-lg bg-sky-500 text-white text-sm font-semibold
                       hover:bg-sky-400 active:scale-[0.98] transition-all shadow-lg shadow-sky-500/20"
          >
            포트폴리오 열기
            <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
          <span className="text-xs text-zinc-600 font-mono">로그인 불필요</span>
        </div>
      </div>

      {/* 피처 칩 3개 */}
      <div className="relative flex flex-wrap justify-center gap-2.5 mt-2 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
        {[
          { icon: "📈", label: "실시간 시세 (주식·코인·금)" },
          { icon: "⚖️", label: "리밸런싱 알림" },
          { icon: "🔒", label: "LocalStorage 전용 저장" },
        ].map(({ icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/50 text-xs text-zinc-400"
          >
            <span>{icon}</span>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
