"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useAssetPrices } from "@/lib/api";
import { useAssetStore } from "@/lib/store";
import PortfolioSummary from "@/components/portfolio/PortfolioSummary";
import PortfolioChart from "@/components/portfolio/PortfolioChart";
import PortfolioPieChart from "@/components/portfolio/PortfolioPieChart";
import AssetTable from "@/components/portfolio/AssetTable";
import AddAssetForm from "@/components/portfolio/AddAssetForm";

export default function PortfolioPage() {
  const { status } = useSession();
  const router = useRouter();
  const { refresh, loading, error, lastUpdated } = useAssetPrices();
  const { mutationVersion, loadAssetsFromServer } = useAssetStore();
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialized = useRef(false);
  const [serverLoading, setServerLoading] = useState(true);

  // 비로그인 접근 시 로그인 페이지로 리다이렉트 (미들웨어 2차 안전망)
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  // 마운트 시 서버에서 자산 로드 후 시세 갱신
  useEffect(() => {
    if (status !== "authenticated") return;

    async function loadAndRefresh() {
      try {
        const res = await fetch("/api/assets");
        if (res.ok) {
          const body = await res.json();
          loadAssetsFromServer(body.assets ?? []);
        }
      } catch (e) {
        console.error("[Portfolio] 자산 로드 실패:", e);
      } finally {
        setServerLoading(false);
        refresh();
        initialized.current = true;
      }
    }

    loadAndRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // 사용자 뮤테이션 발생 시 1.5s 디바운스 후 서버 동기화
  // useAssetStore.getState()로 최신 assets를 직접 읽어 stale closure 방지
  useEffect(() => {
    if (!initialized.current || mutationVersion === 0) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      const currentAssets = useAssetStore.getState().assets;
      fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assets: currentAssets }),
      }).catch((e) => console.error("[Portfolio] 자산 동기화 실패:", e));
    }, 1500);
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mutationVersion]);

  // 세션 확인 중
  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse-dot" />
      </div>
    );
  }

  // 서버에서 자산 로딩 중
  if (serverLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center gap-3 text-[#3a4a6a]">
        <svg className="w-4 h-4 animate-spin text-sky-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-xs font-mono tracking-wider">포트폴리오 불러오는 중…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PortfolioSummary
        onRefresh={refresh}
        loading={loading}
        error={error}
        lastUpdated={lastUpdated}
      />

      {/* 자산 비중(파이차트) + 총액 추이(라인차트) 나란히 배치 */}
      <div className="grid grid-cols-1 lg:grid-cols-[5fr_7fr] gap-6">
        <PortfolioPieChart />
        <PortfolioChart />
      </div>

      <AssetTable />
      <AddAssetForm />
    </div>
  );
}
