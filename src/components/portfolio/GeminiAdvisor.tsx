"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useAssetStore, selectRebalanceSummary } from "@/lib/store";
import { MANUAL_CATEGORIES } from "@/lib/types";

type Message = { role: "user" | "model"; text: string };

/* ── 포트폴리오 요약 텍스트 생성 ─────────────────────────────────── */
function buildPortfolioSummary(
  assets: ReturnType<typeof useAssetStore.getState>["assets"],
  exchangeRate: number,
  thresholdPct: number
) {
  if (assets.length === 0) return "포트폴리오에 등록된 자산이 없습니다.";

  const rate = exchangeRate > 0 ? exchangeRate : 1400;
  const summary = selectRebalanceSummary(assets, thresholdPct, rate);

  const lines: string[] = [
    `총 자산 수: ${assets.length}개`,
    `전체 평가금액(KRW 환산): ₩${Math.round(summary.totalValue).toLocaleString("ko-KR")}`,
    `환율: $1 = ₩${Math.round(rate).toLocaleString("ko-KR")}`,
    `리밸런싱 임계치: ±${thresholdPct}%p`,
    "",
    "=== 자산 목록 ===",
  ];

  for (const a of assets) {
    const r = summary.results.find((x) => x.id === a.id);
    const isManual = MANUAL_CATEGORIES.has(a.category);
    lines.push(
      `- [${a.category}] ${a.name} (${a.ticker})` +
        ` | 수량: ${isManual ? "-" : a.shares}` +
        ` | 평가: ${r ? `₩${Math.round(r.currentValue).toLocaleString("ko-KR")}` : "미정"}` +
        ` | 현재비중: ${r ? `${(r.currentWeight * 100).toFixed(1)}%` : "-"}` +
        ` | 목표비중: ${a.targetRatio}%` +
        ` | 괴리: ${r ? `${r.deviationPct >= 0 ? "+" : ""}${r.deviationPct.toFixed(1)}%p` : "-"}` +
        (r?.needsRebalancing ? " ⚠️ 임계초과" : "")
    );
  }

  const alerts = summary.results.filter((r) => r.needsRebalancing);
  if (alerts.length > 0) {
    lines.push("", "=== 리밸런싱 필요 자산 ===");
    for (const r of alerts) {
      const action = r.rebalanceAmount > 0 ? "매수" : "매도";
      lines.push(
        `- ${r.name}: ${action} ₩${Math.abs(Math.round(r.rebalanceAmount)).toLocaleString("ko-KR")} (괴리 ${r.deviationPct >= 0 ? "+" : ""}${r.deviationPct.toFixed(1)}%p)`
      );
    }
  }

  return lines.join("\n");
}

/* ── 마크다운 간이 렌더러 ────────────────────────────────────────── */
function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Headers
    if (line.startsWith("### ")) {
      elements.push(
        <p key={i} className="font-display text-xs font-bold tracking-wider uppercase mt-3 mb-1"
          style={{ color: "rgba(0,212,255,0.8)" }}>{line.slice(4)}</p>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <p key={i} className="font-display text-sm font-bold tracking-wider uppercase mt-3 mb-1"
          style={{ color: "#00d4ff", textShadow: "0 0 8px rgba(0,212,255,0.3)" }}>{line.slice(3)}</p>
      );
      continue;
    }

    // Bold
    line = line.replace(/\*\*(.+?)\*\*/g, '<b style="color:#d8eef8;font-weight:600">$1</b>');
    // Inline code
    line = line.replace(/`(.+?)`/g, '<code style="color:#ffbb33;font-size:0.85em;background:rgba(255,187,51,0.08);padding:1px 4px">$1</code>');

    // Bullet
    if (line.startsWith("- ") || line.startsWith("• ")) {
      elements.push(
        <div key={i} className="flex gap-2 ml-2 my-0.5">
          <span style={{ color: "rgba(0,212,255,0.4)" }}>▸</span>
          <span className="text-[12px] leading-relaxed" style={{ color: "rgba(216,238,248,0.8)" }}
            dangerouslySetInnerHTML={{ __html: line.slice(2) }} />
        </div>
      );
      continue;
    }

    // Numbered list
    const numMatch = line.match(/^(\d+)\.\s(.+)/);
    if (numMatch) {
      elements.push(
        <div key={i} className="flex gap-2 ml-2 my-0.5">
          <span className="font-mono text-[10px] min-w-[16px]" style={{ color: "rgba(0,212,255,0.5)" }}>{numMatch[1]}.</span>
          <span className="text-[12px] leading-relaxed" style={{ color: "rgba(216,238,248,0.8)" }}
            dangerouslySetInnerHTML={{ __html: numMatch[2] }} />
        </div>
      );
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
      continue;
    }

    // Normal paragraph
    elements.push(
      <p key={i} className="text-[12px] leading-relaxed my-0.5"
        style={{ color: "rgba(216,238,248,0.8)" }}
        dangerouslySetInnerHTML={{ __html: line }} />
    );
  }

  return elements;
}

/* ── 메인 컴포넌트 ──────────────────────────────────────────────── */
export default function GeminiAdvisor() {
  const { assets, exchangeRate, thresholdPct } = useAssetStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const portfolioSummary = useMemo(
    () => buildPortfolioSummary(assets, exchangeRate, thresholdPct),
    [assets, exchangeRate, thresholdPct]
  );

  const hasAssets = assets.length > 0;

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      const userMsg: Message = { role: "user", text: text.trim() };
      const allMessages = [...messages, userMsg];
      setMessages(allMessages);
      setInput("");
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/gemini/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: allMessages, portfolio: portfolioSummary }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "요청 실패");
          return;
        }

        setMessages([...allMessages, { role: "model", text: data.response }]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "네트워크 오류");
      } finally {
        setLoading(false);
      }
    },
    [messages, loading, portfolioSummary]
  );

  const handleInitialAnalysis = useCallback(() => {
    sendMessage("현재 내 포트폴리오를 분석하고 리밸런싱 방향을 제안해 주세요. 카테고리별 분산도, 통화 분산, 목표 비중 괴리 순으로 분석해 주세요.");
  }, [sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Quick suggestion chips
  const suggestions = [
    "리밸런싱 우선순위를 알려줘",
    "리스크가 높은 자산은?",
    "분산 투자 개선 방안은?",
    "현금 비중을 어떻게 조절할까?",
  ];

  return (
    <div className="animate-fade-in-up">
      {/* Section header — toggleable */}
      <div
        className="flex items-center gap-4 cursor-pointer select-none group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: "#aa88ff",
              boxShadow: "0 0 6px rgba(170,136,255,0.8)",
              animation: loading ? "pulse 1.5s infinite" : undefined,
            }}
          />
          <span className="font-display text-[10px] tracking-[0.35em] uppercase"
            style={{ color: "rgba(170,136,255,0.7)" }}>
            AI REBALANCE ADVISOR
          </span>
          <span className="font-mono text-[9px]" style={{ color: "rgba(170,136,255,0.35)" }}>
            GEMINI
          </span>
        </div>
        <div className="h-px flex-1"
          style={{ background: "linear-gradient(90deg, rgba(170,136,255,0.25), transparent)" }} />
        <span
          className="font-display text-[10px] tracking-[0.2em] transition-colors"
          style={{ color: "rgba(170,136,255,0.5)" }}
        >
          {isOpen ? "[ COLLAPSE ]" : "[ EXPAND ]"}
        </span>
      </div>

      {/* Collapsible panel */}
      {isOpen && (
        <div
          className="relative mt-3 overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(14,29,53,0.97) 0%, rgba(10,22,40,0.99) 100%)",
            border: "1px solid rgba(170,136,255,0.2)",
            boxShadow: "0 0 0 1px rgba(170,136,255,0.04), inset 0 0 60px rgba(100,60,200,0.04), 0 8px 40px rgba(0,4,16,0.7)",
          }}
        >
          {/* Top glow */}
          <div className="absolute top-0 inset-x-0 h-px pointer-events-none z-10"
            style={{ background: "linear-gradient(90deg, transparent, rgba(170,136,255,0.5), transparent)" }} />

          {/* Corner brackets */}
          <div className="absolute top-0 left-0 w-3 h-3 z-10" style={{ borderTop: "1px solid rgba(170,136,255,0.5)", borderLeft: "1px solid rgba(170,136,255,0.5)" }} />
          <div className="absolute top-0 right-0 w-3 h-3 z-10" style={{ borderTop: "1px solid rgba(170,136,255,0.5)", borderRight: "1px solid rgba(170,136,255,0.5)" }} />
          <div className="absolute bottom-0 left-0 w-3 h-3 z-10" style={{ borderBottom: "1px solid rgba(170,136,255,0.5)", borderLeft: "1px solid rgba(170,136,255,0.5)" }} />
          <div className="absolute bottom-0 right-0 w-3 h-3 z-10" style={{ borderBottom: "1px solid rgba(170,136,255,0.5)", borderRight: "1px solid rgba(170,136,255,0.5)" }} />

          {/* Messages area */}
          <div ref={scrollRef} className="px-5 py-4 overflow-y-auto" style={{ maxHeight: 420, minHeight: 200 }}>
            {messages.length === 0 && !loading ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center gap-4 py-8">
                <div className="w-12 h-12 flex items-center justify-center"
                  style={{ border: "1px solid rgba(170,136,255,0.15)", background: "rgba(170,136,255,0.03)" }}>
                  <svg className="w-5 h-5" style={{ color: "rgba(170,136,255,0.4)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="font-display text-xs tracking-[0.2em] uppercase" style={{ color: "rgba(170,136,255,0.6)" }}>
                    AI PORTFOLIO ADVISOR
                  </p>
                  <p className="font-sans text-[11px] mt-1" style={{ color: "rgba(170,136,255,0.4)" }}>
                    Gemini가 포트폴리오를 분석하고 리밸런싱을 제안합니다
                  </p>
                </div>

                {hasAssets ? (
                  <button
                    onClick={handleInitialAnalysis}
                    className="group relative flex items-center gap-2 px-5 py-2.5 font-display text-[11px] tracking-[0.2em] uppercase overflow-hidden transition-all"
                    style={{
                      border: "1px solid rgba(170,136,255,0.4)",
                      color: "#aa88ff",
                      background: "rgba(170,136,255,0.06)",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(170,136,255,0.12)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(170,136,255,0.06)"; }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    ANALYZE PORTFOLIO
                  </button>
                ) : (
                  <p className="font-mono text-[10px]" style={{ color: "rgba(170,136,255,0.3)" }}>
                    자산을 등록한 후 분석을 시작하세요
                  </p>
                )}
              </div>
            ) : (
              /* Message list */
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className="max-w-[85%] px-4 py-3 relative"
                      style={{
                        background: msg.role === "user"
                          ? "rgba(0,212,255,0.08)"
                          : "rgba(170,136,255,0.06)",
                        border: `1px solid ${msg.role === "user" ? "rgba(0,212,255,0.2)" : "rgba(170,136,255,0.15)"}`,
                      }}
                    >
                      {/* Role label */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-1 h-1 rounded-full"
                          style={{
                            background: msg.role === "user" ? "#00d4ff" : "#aa88ff",
                            boxShadow: `0 0 4px ${msg.role === "user" ? "#00d4ff" : "#aa88ff"}`,
                          }} />
                        <span className="font-display text-[8px] tracking-[0.3em] uppercase"
                          style={{ color: msg.role === "user" ? "rgba(0,212,255,0.5)" : "rgba(170,136,255,0.5)" }}>
                          {msg.role === "user" ? "YOU" : "J.A.R.V.I.S"}
                        </span>
                      </div>
                      {/* Content */}
                      {msg.role === "model" ? (
                        <div>{renderMarkdown(msg.text)}</div>
                      ) : (
                        <p className="text-[12px] leading-relaxed" style={{ color: "rgba(216,238,248,0.85)" }}>
                          {msg.text}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Loading indicator */}
                {loading && (
                  <div className="flex justify-start">
                    <div className="px-4 py-3" style={{ background: "rgba(170,136,255,0.06)", border: "1px solid rgba(170,136,255,0.15)" }}>
                      <div className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full" style={{ background: "#aa88ff", boxShadow: "0 0 4px #aa88ff" }} />
                        <span className="font-display text-[8px] tracking-[0.3em] uppercase" style={{ color: "rgba(170,136,255,0.5)" }}>
                          J.A.R.V.I.S
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <svg className="w-3.5 h-3.5 animate-spin" style={{ color: "rgba(170,136,255,0.6)" }} fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className="font-mono text-[10px] animate-pulse" style={{ color: "rgba(170,136,255,0.5)" }}>
                          ANALYZING...
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Error banner */}
          {error && (
            <div className="mx-5 mb-2 px-3 py-2 text-xs font-mono"
              style={{ border: "1px solid rgba(255,51,85,0.3)", background: "rgba(255,51,85,0.08)", color: "#ff3355" }}>
              [ERR] {error}
            </div>
          )}

          {/* Quick suggestion chips (show when messages exist and not loading) */}
          {messages.length > 0 && !loading && (
            <div className="px-5 pb-2 flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="px-2.5 py-1 font-sans text-[10px] transition-all"
                  style={{
                    border: "1px solid rgba(170,136,255,0.15)",
                    color: "rgba(170,136,255,0.55)",
                    background: "rgba(170,136,255,0.03)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(170,136,255,0.1)";
                    e.currentTarget.style.color = "rgba(170,136,255,0.8)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(170,136,255,0.03)";
                    e.currentTarget.style.color = "rgba(170,136,255,0.55)";
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input bar */}
          <div className="px-4 py-3" style={{ borderTop: "1px solid rgba(170,136,255,0.12)" }}>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="리밸런싱에 대해 질문하세요..."
                  disabled={loading}
                  className="w-full px-3 py-2.5 font-sans text-[12px] placeholder:text-[rgba(170,136,255,0.25)] disabled:opacity-40 outline-none"
                  style={{
                    background: "rgba(170,136,255,0.04)",
                    border: "1px solid rgba(170,136,255,0.15)",
                    color: "#d8eef8",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(170,136,255,0.4)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(170,136,255,0.15)"; }}
                />
              </div>
              <button
                onClick={() => sendMessage(input)}
                disabled={loading || !input.trim()}
                className="flex items-center gap-1.5 px-4 py-2.5 font-display text-[10px] tracking-[0.2em] uppercase transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  border: "1px solid rgba(170,136,255,0.35)",
                  color: "#aa88ff",
                  background: "rgba(170,136,255,0.06)",
                }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "rgba(170,136,255,0.15)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(170,136,255,0.06)"; }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
                SEND
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
