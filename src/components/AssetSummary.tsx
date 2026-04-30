type Asset = {
  label: string;
  value: number;
  change: number;
};

type AssetSummaryProps = {
  assets?: Asset[];
  totalValue?: number;
};

const defaultAssets: Asset[] = [
  { label: "주식", value: 42500000, change: 3.2 },
  { label: "채권", value: 18000000, change: -0.8 },
  { label: "현금", value: 5000000, change: 0 },
  { label: "대체투자", value: 9500000, change: 1.5 },
];

export default function AssetSummary({
  assets = defaultAssets,
  totalValue = 75000000,
}: AssetSummaryProps) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">자산 요약</h2>
      <div className="mb-6">
        <p className="text-sm text-gray-500">총 자산</p>
        <p className="text-3xl font-bold text-gray-900">
          ₩{totalValue.toLocaleString()}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {assets.map((asset) => (
          <div
            key={asset.label}
            className="bg-gray-50 rounded-xl p-4 flex flex-col gap-1"
          >
            <span className="text-sm text-gray-500">{asset.label}</span>
            <span className="text-base font-semibold text-gray-900">
              ₩{asset.value.toLocaleString()}
            </span>
            <span
              className={`text-xs font-medium ${
                asset.change > 0
                  ? "text-emerald-600"
                  : asset.change < 0
                  ? "text-red-500"
                  : "text-gray-400"
              }`}
            >
              {asset.change > 0 ? "+" : ""}
              {asset.change}%
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
