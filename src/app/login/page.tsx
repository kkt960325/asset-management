"use client";

import { useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/portfolio");
  }, [status, router]);

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="fixed inset-0 z-[60] bg-[#070b12] flex items-center justify-center">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-sky-400"
              style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] bg-[#070b12] flex flex-col items-center justify-center px-6 overflow-hidden">

      {/* ── 배경 효과 ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] rounded-full bg-sky-500/[0.04] blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[5%] w-[500px] h-[500px] rounded-full bg-violet-500/[0.04] blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: "linear-gradient(#38bdf8 1px, transparent 1px), linear-gradient(90deg, #38bdf8 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />
      </div>

      {/* ── 메인 카드 ── */}
      <div className="relative w-full max-w-[400px] flex flex-col items-center gap-10">

        {/* 로고 */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[#e2e8f8] tracking-tight">자산 관리 대시보드</h1>
            <p className="text-sm text-[#4a5a7a] mt-1">포트폴리오를 한눈에 관리하세요</p>
          </div>
        </div>

        {/* 로그인 박스 */}
        <div className="w-full bg-[#0c1121] border border-[#1a2540] rounded-2xl p-8 shadow-2xl shadow-black/50">

          <div className="mb-7">
            <h2 className="text-base font-semibold text-[#e2e8f8]">시작하기</h2>
            <p className="text-[13px] text-[#4a5a7a] mt-1">
              Google 계정으로 로그인하면<br />나만의 포트폴리오가 생성됩니다.
            </p>
          </div>

          {/* Google 로그인 버튼 */}
          <button
            onClick={() => signIn("google", { callbackUrl: "/portfolio" })}
            className="group w-full h-12 rounded-xl bg-white text-[#1a1a1a] text-sm font-semibold
                       flex items-center justify-center gap-3 shadow-lg shadow-black/20
                       hover:bg-gray-50 hover:shadow-xl hover:shadow-black/25
                       active:scale-[0.98] transition-all duration-150"
          >
            {/* Google 컬러 로고 */}
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google로 계속하기
          </button>

          {/* 구분선 */}
          <div className="mt-6 pt-6 border-t border-[#1a2540]">
            <ul className="space-y-2">
              {[
                "계정별 독립 포트폴리오 관리",
                "실시간 시세 및 리밸런싱 알림",
                "다른 사용자의 데이터와 완전 분리",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-[12px] text-[#4a5a7a]">
                  <svg className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="text-[11px] text-[#1e2d45] font-mono tracking-widest">
          ASSET_MGR · PRIVATE DASHBOARD
        </p>
      </div>
    </div>
  );
}
