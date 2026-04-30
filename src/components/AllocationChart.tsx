type AllocationItem = {
  label: string;
  percent: number;
  color: string;
};

type AllocationChartProps = {
  items?: AllocationItem[];
};

const defaultItems: AllocationItem[] = [
  { label: "국내 주식", percent: 35, color: "bg-blue-500" },
  { label: "해외 주식", percent: 22, color: "bg-indigo-400" },
  { label: "국내 채권", percent: 15, color: "bg-emerald-400" },
  { label: "해외 채권", percent: 9, color: "bg-teal-300" },
  { label: "대체투자", percent: 12, color: "bg-amber-400" },
  { label: "현금", percent: 7, color: "bg-gray-300" },
];

export default function AllocationChart({ items = defaultItems }: AllocationChartProps) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">자산 배분</h2>

      {/* Stacked bar */}
      <div className="flex h-6 rounded-full overflow-hidden gap-0.5 mb-6">
        {items.map((item) => (
          <div
            key={item.label}
            className={`${item.color} transition-all`}
            style={{ width: `${item.percent}%` }}
            title={`${item.label}: ${item.percent}%`}
          />
        ))}
      </div>

      {/* Legend */}
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${item.color} flex-shrink-0`} />
              <span className="text-sm text-gray-700">{item.label}</span>
            </div>
            <div className="flex items-center gap-3">
              <div
                className="h-1.5 rounded-full bg-gray-100 w-24 overflow-hidden"
                aria-hidden="true"
              >
                <div
                  className={`h-full rounded-full ${item.color}`}
                  style={{ width: `${item.percent}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-gray-800 w-8 text-right">
                {item.percent}%
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
