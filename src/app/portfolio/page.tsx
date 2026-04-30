"use client";

import { useEffect, useRef } from "react";
import { useAssetPrices } from "@/lib/api";
import { useAssetStore } from "@/lib/store";
import PortfolioSummary from "@/components/portfolio/PortfolioSummary";
import PortfolioChart from "@/components/portfolio/PortfolioChart";
import PortfolioPieChart from "@/components/portfolio/PortfolioPieChart";
import AssetTable from "@/components/portfolio/AssetTable";
import AddAssetForm from "@/components/portfolio/AddAssetForm";

export default function PortfolioPage() {
  const { refresh, loading, error, lastUpdated } = useAssetPrices();
  const { assets, mutationVersion, loadAssetsFromServer } = useAssetStore();
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialized = useRef(false);

  // 마운트 시 서버에서 자산 로드 후 시세 갱신
  useEffect(() => {
    async function loadAndRefresh() {
      try {
        const res = await fetch("/api/assets");
        if (res.ok) {
          const { assets: serverAssets } = await res.json();
          loadAssetsFromServer(serverAssets);
        }
      } catch {
        // 네트워크 오류 시 빈 상태 유지
      } finally {
        refresh();
        initialized.current = true;
      }
    }
    loadAndRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 사용자 뮤테이션 발생 시 1.5s 디바운스 후 서버 동기화
  useEffect(() => {
    if (!initialized.current || mutationVersion === 0) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assets }),
      });
    }, 1500);
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mutationVersion]);

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
