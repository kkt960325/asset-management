"use client";

import { useEffect } from "react";
import { useAssetPrices } from "@/lib/api";
import PortfolioSummary from "@/components/portfolio/PortfolioSummary";
import PortfolioChart from "@/components/portfolio/PortfolioChart";
import AssetTable from "@/components/portfolio/AssetTable";
import AddAssetForm from "@/components/portfolio/AddAssetForm";

export default function PortfolioPage() {
  const { refresh, loading, error, lastUpdated } = useAssetPrices();

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
      <PortfolioChart />
      <AssetTable />
      <AddAssetForm />
    </div>
  );
}
