"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 이미 인증된 경우 포트폴리오로 리다이렉트
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/portfolio");
    }
  }, [status, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("비밀번호가 올바르지 않습니다.");
      setPassword("");
    } else {
      router.replace("/portfolio");
    }
  }

  // 세션 확인 중 또는 이미 인증됨 → 빈 화면
  if (status === "loading" || status === "authenticated") {
    return (
      <div className="min-h-screen bg-[#070b12] flex items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse-dot" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b12] flex items-center justify-center px-4">
      {/* 배경 그라디언트 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-sky-500/5 rounded-full blur-3xl" />
        <div className="absolute top-2/3 left-1/3 w-[300px] h-[300px] bg-violet-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm animate-fade-in-up">
        {/* 로고 */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse-dot" />
          <span className="font-mono text-sky-400 font-semibold tracking-[0.3em] text-sm uppercase">
            ASSET_MGR
          </span>
        </div>

        {/* 카드 */}
        <div className="rounded-2xl border border-[#1a2540] bg-[#0c1121] p-8 shadow-2xl shadow-black/50">
          <div className="mb-7">
            <h1 className="text-lg font-bold text-[#e2e8f8] mb-1">액세스 확인</h1>
            <p className="text-[#3a4a6a] text-sm">대시보드에 접근하려면 비밀번호를 입력하세요.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-widest text-[#3a4a6a] font-semibold">
                비밀번호
              </label>
              <input
                autoFocus
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder="••••••••••••"
                className={`h-10 bg-[#111827] border rounded-lg px-3 font-mono text-sm text-[#e2e8f8] placeholder-[#3a4a6a] focus:outline-none transition-all ${
                  error
                    ? "border-rose-500/60 focus:border-rose-400"
                    : "border-[#1a2540] focus:border-sky-500/50 focus:bg-[#0d1828]"
                }`}
              />
              {error && (
                <p className="text-rose-400 text-xs flex items-center gap-1.5 mt-0.5">
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full h-10 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-400 text-sm font-semibold hover:bg-sky-500/25 hover:border-sky-400/60 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  확인 중…
                </>
              ) : (
                "입장하기"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[#1a2540] text-[10px] font-mono mt-6 tracking-wider">
          PRIVATE DASHBOARD · AUTHORIZED ACCESS ONLY
        </p>
      </div>
    </div>
  );
}
