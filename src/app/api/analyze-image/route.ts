import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/auth";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  try {
    const formData = await req.formData();
    const file = formData.get("image") as File;
    if (!file) return NextResponse.json({ error: "No image" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mediaType = (file.type || "image/jpeg") as
      | "image/jpeg"
      | "image/png"
      | "image/gif"
      | "image/webp";

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: `提示された画像を分析し、以下のJSON形式で返してください。余分な説明は不要、JSONのみ返すこと。
画像内のテキスト・文字・ロゴ・透かし・キャプションは完全に無視してください。
{
  "shot": "ショットの種類と画角（例：全身・正面・ローアングル）とカメラ距離・フレーミング。30文字以内。",
  "pose": "人物の正確なポーズ。体の向き・重心・足の位置・腕の角度。色・服装・ライティングは無視。40文字以内。",
  "hands": "手・指・視線の具体的な動きや位置。人物がいない場合は空文字。30文字以内。",
  "background": "背景の主要な要素と配置・位置関係のみ。ぼかしや光・文字は無視。40文字以内。"
}`,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            { type: "text", text: "このイメージを解析してプロンプトを生成して" },
          ],
        },
      ],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "{}";
    let fields = { shot: "", pose: "", hands: "", background: "" };
    try {
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      fields = { ...fields, ...parsed };
    } catch {
      fields.pose = raw;
    }
    return NextResponse.json({ fields });
  } catch (e) {
    console.error("[analyze-image]", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
