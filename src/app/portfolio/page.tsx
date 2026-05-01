"use client";

import { useEffect } from "react";
import { useAssetPrices } from "@/lib/api";
import PortfolioSummary from "@/components/portfolio/PortfolioSummary";
import PortfolioChart from "@/components/portfolio/PortfolioChart";
import PortfolioPieChart from "@/components/portfolio/PortfolioPieChart";
import AssetTable from "@/components/portfolio/AssetTable";
import AddAssetForm from "@/components/portfolio/AddAssetForm";
import SyncButton from "@/components/portfolio/SyncButton";

export default function PortfolioPage() {
  const { refresh, loading, error, lastUpdated, usingMock } = useAssetPrices();

  // 마운트 시 1회 시세 조회
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refresh(); }, []);

  return (
    <div className="space-y-6">
      <PortfolioSummary
        onRefresh={refresh}
        loading={loading}
        error={error}
        lastUpdated={lastUpdated}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[5fr_7fr] gap-6">
        <PortfolioPieChart />
        <PortfolioChart />
      </div>
      <AssetTable loading={loading} />
      <AddAssetForm />

      {/* Fixed sync button — always visible, top-right corner */}
      <SyncButton onSync={refresh} loading={loading} usingMock={usingMock} />
    </div>
  );
}
