import { getSupabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/auth";

const SUPABASE_STORAGE_PREFIX = /\/storage\/v1\/object\/public\/library\//;

/** Supabase ストレージの URL からパスを抽出 */
function extractStoragePath(url: string): string | null {
  const match = url.match(SUPABASE_STORAGE_PREFIX);
  if (!match) return null;
  return url.slice(url.indexOf(match[0]) + match[0].length);
}

export async function DELETE(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  const { id, tool } = await req.json() as { id: string; tool: string };
  if (!id) return NextResponse.json({ error: "id が必要です" }, { status: 400 });

  const supabase = getSupabase();

  try {
    if (tool === "sketch") {
      // rough_generations テーブルから削除
      const { data, error: fetchErr } = await supabase
        .from("rough_generations")
        .select("generated_images_urls, original_image_url")
        .eq("id", id)
        .single();

      if (fetchErr) throw new Error(fetchErr.message);

      // ストレージから画像を削除
      const urls: string[] = [
        ...(data?.generated_images_urls ?? []),
        data?.original_image_url,
      ].filter(Boolean) as string[];

      const paths = urls.map(extractStoragePath).filter(Boolean) as string[];
      if (paths.length > 0) {
        await supabase.storage.from("library").remove(paths);
      }

      const { error } = await supabase.from("rough_generations").delete().eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      // library_items テーブルから削除
      const { data, error: fetchErr } = await supabase
        .from("library_items")
        .select("image_url, extra_urls")
        .eq("id", id)
        .single();

      if (fetchErr) throw new Error(fetchErr.message);

      // ストレージから画像を削除
      const urls: string[] = [
        data?.image_url,
        ...(data?.extra_urls ?? []),
      ].filter(Boolean) as string[];

      const paths = urls.map(extractStoragePath).filter(Boolean) as string[];
      if (paths.length > 0) {
        await supabase.storage.from("library").remove(paths);
      }

      const { error } = await supabase.from("library_items").delete().eq("id", id);
      if (error) throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[library DELETE]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
