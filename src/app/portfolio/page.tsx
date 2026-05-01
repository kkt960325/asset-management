"use client";

import { useEffect, useRef } from "react";
import { useAssetPrices, getLastDebugInfo } from "@/lib/api";
import { useAssetStore } from "@/lib/store";
import { MANUAL_CATEGORIES } from "@/lib/types";
import PortfolioSummary from "@/components/portfolio/PortfolioSummary";
import PortfolioChart from "@/components/portfolio/PortfolioChart";
import PortfolioPieChart from "@/components/portfolio/PortfolioPieChart";
import AssetTable from "@/components/portfolio/AssetTable";
import AddAssetForm from "@/components/portfolio/AddAssetForm";
import SyncButton from "@/components/portfolio/SyncButton";

export default function PortfolioPage() {
  const { refresh, loading, error, lastUpdated, usingMock, assets } = useAssetPrices();

  // Keep a stable ref to refresh so the force-sync effect doesn't re-trigger
  // when the refresh callback identity changes (which happens when assets update).
  const refreshRef = useRef(refresh);
  useEffect(() => { refreshRef.current = refresh; });

  // ── Force-sync on initial load ──────────────────────────────────────────────
  // Handles Zustand persist hydration timing: in Next.js App Router the server
  // renders with assets=[] (no localStorage). The persist middleware may update
  // the store asynchronously after React's initial hydration pass. Using
  // assets.length as a dep fires exactly once when assets become available,
  // even if that happens after the initial mount.
  const hasFetched = useRef(false);
  useEffect(() => {
    if (assets.length === 0 || hasFetched.current) return;
    hasFetched.current = true;
    refreshRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets.length]);

  // ── Client-side debug mode ──────────────────────────────────────────────────
  // window.debugAssets() in the browser console shows a ticker-by-ticker
  // comparison between the store state and the last API price map.
  useEffect(() => {
    (window as typeof window & { debugAssets: () => void }).debugAssets = () => {
      const state = useAssetStore.getState();
      const info = getLastDebugInfo();

      console.group(
        "%c🔍 debugAssets() — SEUNGHANIST 티커 매칭 진단",
        "font-weight:bold;font-size:14px;color:#00d4ff"
      );

      console.log("%c📦 Store 자산 목록", "color:#00ff88;font-weight:bold");
      state.assets.forEach((a) => {
        const isMarket = !MANUAL_CATEGORIES.has(a.category);
        console.log(
          `${isMarket ? "💹" : "🔒"} [${a.category}] ticker="${a.ticker}"` +
            ` shares=${a.shares}` +
            ` currentPrice=${a.currentPrice ?? "undefined"}` +
            ` currentValue=${a.currentValue ?? "undefined"}` +
            ` currency=${a.currency ?? "none"}`
        );
      });

      if (!info) {
        console.warn("⚠️ 시세 데이터 없음 — SYNC 버튼을 눌러주세요.");
        console.groupEnd();
        return;
      }

      console.log(
        `%c💹 마지막 API 가격 맵 (${info.fetchedAt.toLocaleTimeString()}${info.mock ? " · MOCK" : ""})`,
        "color:#00d4ff;font-weight:bold"
      );
      if (Object.keys(info.priceMap).length === 0) {
        console.warn("  (빈 가격 맵 — 시세를 가져오지 못했습니다)");
      } else {
        Object.entries(info.priceMap).forEach(([k, v]) => {
          console.log(`  "${k}" → ${v.price} ${v.currency}`);
        });
      }
      if (info.failed.length > 0) {
        console.warn(`❌ 조회 실패 티커: [${info.failed.join(", ")}]`);
      }

      console.log("%c🔗 매칭 결과", "color:#ffaa00;font-weight:bold");
      const marketAssets = state.assets.filter((a) => !MANUAL_CATEGORIES.has(a.category));
      if (marketAssets.length === 0) {
        console.warn("  (시세 조회 대상 자산 없음 — 모두 수동 자산)");
      } else {
        marketAssets.forEach((a) => {
          const exact    = info.priceMap[a.ticker];
          const withUSD  = info.priceMap[`${a.ticker}-USD`];
          const upper    = info.priceMap[a.ticker.toUpperCase()];
          const stripped = info.priceMap[
            a.ticker.toUpperCase().replace(/\.(KS|KQ|KN)$/i, "").replace(/-USD$/i, "")
          ];
          const matched = exact ?? withUSD ?? upper ?? stripped;

          if (matched) {
            console.log(
              `  ✅ "${a.ticker}" → 매칭 성공  price=${matched.price} ${matched.currency}`
            );
          } else {
            console.warn(
              `  ❌ "${a.ticker}" → 매칭 실패!\n` +
                `     저장된 가격맵 키: [${Object.keys(info.priceMap).join(", ")}]\n` +
                `     시도 가능한 변환: "${a.ticker.toUpperCase()}", ` +
                `"${a.ticker}-USD", ` +
                `"${a.ticker.replace(/\.(KS|KQ|KN)$/i, "")}"`
            );
          }
        });
      }

      console.groupEnd();
    };

    console.log(
      "%c💡 SEUNGHANIST 디버그 준비 완료 — 콘솔에 debugAssets() 를 입력하세요",
      "color:#00d4ff;font-size:11px"
    );
  }, []);

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
