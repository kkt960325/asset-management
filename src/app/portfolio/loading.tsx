export default function PortfolioLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex items-center gap-3 text-[#3a4a6a]">
        <svg className="w-4 h-4 animate-spin text-sky-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-xs font-mono tracking-wider">포트폴리오 불러오는 중…</span>
      </div>
    </div>
  );
}
