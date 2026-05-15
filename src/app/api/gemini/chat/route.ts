import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";
export const maxDuration = 30;

/* ── 타입 ──────────────────────────────────────────────────────────── */
type Message = { role: "user" | "model"; text: string };
type RequestBody = {
  messages: Message[];
  portfolio: string; // 포트폴리오 JSON 요약
};

/* ── 시스템 프롬프트 ──────────────────────────────────────────────── */
const SYSTEM_PROMPT = `당신은 "J.A.R.V.I.S Financial Advisor" — SEUNGHANIST 포트폴리오 관리 시스템의 AI 어드바이저입니다.

역할:
- 사용자의 포트폴리오 데이터를 분석하여 리밸런싱 방향을 제안합니다.
- 자산 배분, 리스크 관리, 분산 투자 원칙에 기반한 조언을 제공합니다.
- 한국어로 대화하며, 전문적이되 이해하기 쉬운 설명을 합니다.

분석 원칙:
1. 목표 비중(targetRatio)과 현재 비중의 괴리를 파악합니다.
2. 자산 카테고리별 분산도를 평가합니다.
3. KRW/USD 통화 분산을 고려합니다.
4. 구체적인 매수/매도 금액과 방향을 제안합니다.
5. 시장 상황에 대한 일반적인 코멘트를 추가합니다.

응답 형식:
- 명확하고 구조화된 답변 (마크다운 형식 사용 가능)
- 핵심 수치는 굵게 표시
- 구체적인 액션 아이템 제시
- 간결하되 필요한 설명은 충분히

주의사항:
- 투자 조언의 한계를 인지하고, 최종 판단은 사용자에게 있음을 명시합니다.
- 특정 종목 매수/매도 "추천"이 아닌 포트폴리오 구조적 "제안"을 합니다.
- 과도한 자신감이나 확정적 예측을 피합니다.`;

/* ── POST /api/gemini/chat ──────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY 환경변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  try {
    const body = (await req.json()) as RequestBody;
    const { messages, portfolio } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "메시지가 없습니다." }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_PROMPT,
    });

    // Build chat history
    const chatHistory = [];

    // First inject portfolio context as the opening exchange
    chatHistory.push({
      role: "user" as const,
      parts: [{ text: `[포트폴리오 데이터]\n${portfolio}\n\n위 포트폴리오를 분석하여 리밸런싱 방향을 제안해 주세요.` }],
    });

    // Add previous model/user messages (skip the first user message since we used it above)
    for (let i = 0; i < messages.length - 1; i++) {
      const m = messages[i];
      chatHistory.push({
        role: m.role === "user" ? ("user" as const) : ("model" as const),
        parts: [{ text: m.text }],
      });
    }

    const chat = model.startChat({ history: chatHistory });

    // Send the latest user message
    const lastMsg = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMsg.text);
    const responseText = result.response.text();

    return NextResponse.json({ response: responseText });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[gemini/chat] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
