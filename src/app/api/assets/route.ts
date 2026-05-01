import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { Asset } from "@/lib/types";

// GET /api/assets — 로그인한 사용자의 자산만 반환
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("assets")
    .select("data")
    .eq("user_id", session.user.id)
    .order("updated_at", { ascending: true });

  if (error) {
    console.error("[GET /api/assets]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const assets: Asset[] = (data ?? []).map((row) => row.data as Asset);
  return NextResponse.json({ assets });
}

// POST /api/assets — 현재 사용자의 자산 전체를 덮어쓰기 (upsert + orphan delete)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.assets)) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const assets: Asset[] = body.assets;
  const userId = session.user.id;

  // 1) 현재 사용자의 자산을 모두 삭제한 뒤 다시 삽입 (가장 단순하고 안전)
  const { error: delError } = await supabase
    .from("assets")
    .delete()
    .eq("user_id", userId);

  if (delError) {
    console.error("[POST /api/assets] delete error:", delError.message);
    return NextResponse.json({ error: delError.message }, { status: 500 });
  }

  if (assets.length > 0) {
    const rows = assets.map((a) => ({
      id: a.id,
      user_id: userId,
      data: a,
      updated_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await supabase
      .from("assets")
      .insert(rows);

    if (upsertError) {
      console.error("[POST /api/assets] insert error:", upsertError.message);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
