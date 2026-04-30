"use client";

import { useEffect } from "react";

export default function PortfolioError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Portfolio Error]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
        <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      </div>

      <div>
        <p className="text-[#e2e8f8] text-sm font-semibold mb-1">
          데이터를 불러오는 중 문제가 발생했습니다
        </p>
        <p className="text-[#3a4a6a] text-xs max-w-xs">
          잠시 후 다시 시도하거나, 아래 버튼을 눌러 새로고침 하세요.
        </p>
        {error.digest && (
          <p className="font-mono text-[10px] text-[#1a2540] mt-2">
            오류 코드: {error.digest}
          </p>
        )}
      </div>

      <button
        onClick={reset}
        className="h-9 px-5 bg-sky-500/15 border border-sky-500/30 rounded-lg text-sky-400 text-xs font-semibold hover:bg-sky-500/25 hover:border-sky-400/60 active:scale-95 transition-all"
      >
        다시 시도
      </button>
    </div>
  );
}
