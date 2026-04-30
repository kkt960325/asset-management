type RebalanceRow = {
  asset: string;
  current: number;
  target: number;
  currentValue: number;
  action: "매수" | "매도" | "유지";
  amount: number;
};

type RebalanceTableProps = {
  rows?: RebalanceRow[];
};

const defaultRows: RebalanceRow[] = [
  { asset: "국내 주식", current: 35, target: 40, currentValue: 26250000, action: "매수", amount: 3750000 },
  { asset: "해외 주식", current: 22, target: 20, currentValue: 16500000, action: "매도", amount: 1500000 },
  { asset: "국내 채권", current: 15, target: 15, currentValue: 11250000, action: "유지", amount: 0 },
  { asset: "해외 채권", current: 9, target: 10, currentValue: 6750000, action: "매수", amount: 750000 },
  { asset: "대체투자", current: 12, target: 10, currentValue: 9000000, action: "매도", amount: 1500000 },
  { asset: "현금", current: 7, target: 5, currentValue: 5250000, action: "매도", amount: 1500000 },
];

const actionStyle: Record<RebalanceRow["action"], string> = {
  매수: "bg-emerald-50 text-emerald-700",
  매도: "bg-red-50 text-red-600",
  유지: "bg-gray-100 text-gray-500",
};

export default function RebalanceTable({ rows = defaultRows }: RebalanceTableProps) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">리밸런싱 계획</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-100">
              <th className="pb-3 font-medium">자산군</th>
              <th className="pb-3 font-medium text-right">현재 비중</th>
              <th className="pb-3 font-medium text-right">목표 비중</th>
              <th className="pb-3 font-medium text-right">현재 금액</th>
              <th className="pb-3 font-medium text-center">액션</th>
              <th className="pb-3 font-medium text-right">거래 금액</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((row) => (
              <tr key={row.asset} className="hover:bg-gray-50 transition-colors">
                <td className="py-3 font-medium text-gray-800">{row.asset}</td>
                <td className="py-3 text-right text-gray-600">{row.current}%</td>
                <td className="py-3 text-right text-gray-600">{row.target}%</td>
                <td className="py-3 text-right text-gray-700">
                  ₩{row.currentValue.toLocaleString()}
                </td>
                <td className="py-3 text-center">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${actionStyle[row.action]}`}
                  >
                    {row.action}
                  </span>
                </td>
                <td className="py-3 text-right font-medium text-gray-800">
                  {row.amount > 0 ? `₩${row.amount.toLocaleString()}` : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
