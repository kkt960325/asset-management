import Link from "next/link";
import { FadeUp } from "@/components/ui/FadeUp";

const FEATURES = [
  {
    label: "실시간 시세",
    desc: "주식·코인·금·원자재 가격을 자동으로 불러옵니다. 갱신 버튼 한 번으로 전체 포트폴리오 업데이트.",
  },
  {
    label: "리밸런싱 알림",
    desc: "목표 비중을 설정하면 괴리율이 임계치를 넘는 즉시 알림. 어떤 종목을 얼마나 매수·매도해야 하는지 바로 확인.",
  },
  {
    label: "세금 간이 추정",
    desc: "매도 시 발생하는 양도세·배당세를 카테고리별로 자동 계산. KRX 금현물 비과세 혜택도 반영.",
  },
  {
    label: "로컬 전용 저장",
    desc: "서버 없음. 로그인 없음. 모든 데이터는 브라우저 LocalStorage에만 저장됩니다.",
  },
];

export default function Home() {
  return (
    <div className="relative flex flex-col gap-24 pt-10 pb-24 px-4">

      {/* Subtle background grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.018]"
        style={{
          backgroundImage:
            "linear-gradient(#edeff9 1px, transparent 1px), linear-gradient(90deg, #edeff9 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      {/* Hero */}
      <div className="relative flex flex-col gap-8 max-w-4xl animate-fade-in-up">

        {/* Status pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00c389] animate-pulse-dot" />
          <span className="font-mono text-[11px] text-[#787e88] tracking-widest uppercase">
            Client Only · LocalStorage
          </span>
        </div>

        {/* Headline */}
        <div className="flex flex-col">
          <h1
            className="font-bold text-[#edeff9] leading-[0.9] uppercase"
            style={{ fontSize: "clamp(3rem, 9vw, 7.5rem)", letterSpacing: "-0.03em" }}
          >
            포트폴리오
          </h1>
          <h1
            className="font-bold cm-gradient-text leading-[0.9] uppercase"
            style={{ fontSize: "clamp(3rem, 9vw, 7.5rem)", letterSpacing: "-0.03em" }}
          >
            대시보드
          </h1>
        </div>

        {/* Subtitle */}
        <p className="text-[#787e88] text-lg max-w-md leading-relaxed">
          주식·코인·금·부동산을 한 화면에서.<br />
          로그인 없이, 서버 없이, 브라우저에서 바로.
        </p>

        {/* CTA */}
        <div className="flex items-center gap-5">
          <Link
            href="/portfolio"
            className="group inline-flex items-center gap-2.5 px-7 py-3.5 cm-gradient text-white text-sm font-bold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-[#00c389]/10"
          >
            포트폴리오 열기
            <svg
              className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
          <span className="text-xs text-[#787e88]/50 font-mono">— 무료 · 오픈소스</span>
        </div>
      </div>

      {/* Features grid */}
      <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {FEATURES.map((f, i) => (
          <FadeUp key={f.label} delay={i * 0.08}>
            <div className="group h-full p-6 rounded-xl border border-white/[0.06] bg-[#0a1c2d] hover:bg-[#edeff9] transition-all duration-300 cursor-default">
              <div className="flex flex-col gap-4 h-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00c389] group-hover:bg-[#0a1c2d] transition-colors" />
                <p className="font-bold text-[#edeff9] group-hover:text-[#030e18] transition-colors text-sm uppercase tracking-wider leading-snug">
                  {f.label}
                </p>
                <p className="text-[#787e88] group-hover:text-[#0a1c2d]/65 transition-colors text-xs leading-relaxed">
                  {f.desc}
                </p>
              </div>
            </div>
          </FadeUp>
        ))}
      </div>
    </div>
  );
}
