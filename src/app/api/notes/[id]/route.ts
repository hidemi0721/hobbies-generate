import { getSupabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/auth";


export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = checkAuth(req);
  if (authError) return authError;

  const { id } = await params;
  try {
    const body = await req.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if ("title"   in body) updates.title   = body.title;
    if ("content" in body) updates.content = body.content;
    if ("pinned"  in body) updates.pinned  = body.pinned;

    const { data, error } = await getSupabase()
      .from("notes")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ note: data });
  } catch (e) {
    console.error("[notes PUT]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = checkAuth(req);
  if (authError) return authError;

  const { id } = await params;
  try {
    const { error } = await getSupabase().from("notes").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[notes DELETE]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
