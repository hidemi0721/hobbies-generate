import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  try {
    const { data, error } = await supabase
      .from("notes")
      .select("id, title, content, pinned, created_at, updated_at")
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(200);

    if (error) throw new Error(error.message);
    return NextResponse.json({ notes: data });
  } catch (e) {
    console.error("[notes GET]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  try {
    const { title, content } = await req.json();
    const { data, error } = await supabase
      .from("notes")
      .insert({ title: title ?? "", content: content ?? "" })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ note: data });
  } catch (e) {
    console.error("[notes POST]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
