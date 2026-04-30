import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { Asset } from "@/lib/types";

// GET /api/assets — load current user's assets
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("assets")
    .select("data")
    .eq("user_id", session.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const assets: Asset[] = (data ?? []).map((row) => row.data as Asset);
  return NextResponse.json({ assets });
}

// POST /api/assets — full replace (upsert all rows for user)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const assets: Asset[] = body.assets ?? [];
  const userId = session.user.id;

  // Delete assets that no longer exist
  const incomingIds = assets.map((a) => a.id);
  if (incomingIds.length > 0) {
    await supabase
      .from("assets")
      .delete()
      .eq("user_id", userId)
      .not("id", "in", `(${incomingIds.map((id) => `"${id}"`).join(",")})`);
  } else {
    await supabase.from("assets").delete().eq("user_id", userId);
  }

  if (assets.length > 0) {
    const rows = assets.map((a) => ({
      id: a.id,
      user_id: userId,
      data: a,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("assets").upsert(rows, {
      onConflict: "id,user_id",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
