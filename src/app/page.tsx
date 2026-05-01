import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[72vh] gap-8 text-center">
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#38bdf8 1px, transparent 1px), linear-gradient(90deg, #38bdf8 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <div className="relative flex flex-col items-center gap-6 animate-fade-in-up">
        <p className="font-mono text-xs tracking-[0.3em] text-sky-400 uppercase">
          Asset Management System v1.0
        </p>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-[#e2e8f8]">
          자산 관리<br />
          <span className="text-sky-400">대시보드</span>
        </h1>
        <p className="text-[#8392b0] text-base max-w-sm leading-relaxed">
          포트폴리오 현황, 리밸런싱 계획, 자산 배분을 한눈에 확인하세요.
        </p>
        <Link
          href="/portfolio"
          className="mt-2 px-7 py-3 bg-sky-500/10 border border-sky-500/30 text-sky-400 rounded-lg font-semibold text-sm tracking-wider hover:bg-sky-500/20 hover:border-sky-400 transition-all"
        >
          포트폴리오 열기 →
        </Link>
      </div>
    </div>
  );
}
