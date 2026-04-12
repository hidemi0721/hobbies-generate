import { createClient } from "@supabase/supabase-js";

// モジュールレベルではなくリクエスト時に生成することでビルド時エラーを防ぐ
export function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
