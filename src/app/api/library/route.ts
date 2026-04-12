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

  const tool = req.nextUrl.searchParams.get("tool"); // optional filter

  try {
    // Sketch Generator の既存データ
    const sketchQuery = supabase
      .from("rough_generations")
      .select("id, prompt, original_image_url, generated_images_urls, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    // その他ツールの保存データ
    let libQuery = supabase
      .from("library_items")
      .select("id, tool, title, image_url, extra_urls, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (tool && tool !== "sketch") {
      libQuery = libQuery.eq("tool", tool);
    }

    const [sketchRes, libRes] = await Promise.all([
      tool && tool !== "sketch" ? Promise.resolve({ data: [], error: null }) : sketchQuery,
      tool === "sketch"         ? Promise.resolve({ data: [], error: null }) : libQuery,
    ]);

    if (sketchRes.error) throw new Error(sketchRes.error.message);
    if (libRes.error)    throw new Error(libRes.error.message);

    // Sketch データを統一フォーマットに変換
    const sketchItems = (sketchRes.data ?? []).map((g) => ({
      id:         g.id,
      tool:       "sketch",
      title:      g.prompt?.slice(0, 60) ?? "スケッチ",
      image_url:  g.generated_images_urls?.[0] ?? g.original_image_url,
      extra_urls: g.generated_images_urls ?? [],
      metadata:   { prompt: g.prompt, original_image_url: g.original_image_url },
      created_at: g.created_at,
    }));

    const allItems = [...sketchItems, ...(libRes.data ?? [])]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ items: allItems });
  } catch (e) {
    console.error("[library GET]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
