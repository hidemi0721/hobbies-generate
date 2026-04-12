import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/auth";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const FIELD_VARIANTS: Record<string, string[]> = {
  shot: [
    "引きの構図・全身・中央配置",
    "クローズアップ・上半身・オフセンター",
    "ローアングル・見上げる構図",
    "真上からの俯瞰構図",
    "後ろ姿・背面構図",
    "真横からのシルエット構図",
    "斜めのダッチアングル",
  ],
  pose: [
    "立ち・腕を前に伸ばす",
    "座り・膝を抱える体育座り",
    "しゃがみ・体を縮める",
    "立ち・片足重心・腕を広げる",
    "横向きに寝転ぶ",
    "壁にもたれて立つ",
    "両腕を頭の上に伸ばす",
  ],
  hands: [
    "両手を胸の前で重ねる、視線は正面",
    "片手を顔に添える、視線は斜め上",
    "両手を後ろに組む、視線は下",
    "片手を腰に当てる、視線は正面",
    "腕を前に伸ばして指差す",
    "両手で顔を覆う、視線は隠れる",
  ],
  background: [
    "屋外・公園・木々",
    "室内・窓際・ベッド",
    "都市・夜景・ビル群",
    "空・雲・地平線",
    "シンプルな無地・白背景",
    "階段・廊下・建物内",
  ],
};

const FIELD_INSTRUCTIONS: Record<string, string> = {
  shot: "ショットの種類と画角（30文字以内）",
  pose: "ポーズ・体の向き（40文字以内）",
  hands: "手・視線（30文字以内）",
  background: "背景・環境（40文字以内）",
};

export async function POST(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { fields, targetField } = body as {
      fields?: Record<string, string>;
      targetField?: string;
    };

    // 項目ごとのアレンジ
    if (targetField && FIELD_VARIANTS[targetField]) {
      const variants = FIELD_VARIANTS[targetField];
      const randomVariant = variants[Math.floor(Math.random() * variants.length)];
      const currentValue = fields?.[targetField] ?? "";
      const instruction = FIELD_INSTRUCTIONS[targetField] ?? "30文字以内";

      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 100,
        system: `あなたは構図専門のプロンプトエンジニアです。指定されたバリアントの方向性で1項目だけ書き直し、テキストのみ返してください。余分な説明・JSON・記号は不要。${instruction}。`,
        messages: [
          {
            role: "user",
            content: `バリアント：「${randomVariant}」\n現在の値：${currentValue}\n上記バリアントの方向性に合わせて書き直して。`,
          },
        ],
      });

      const newValue =
        message.content[0].type === "text" ? message.content[0].text.trim() : currentValue;

      return NextResponse.json({ field: targetField, value: newValue, mood: randomVariant });
    }

    return NextResponse.json({ error: "targetField is required" }, { status: 400 });
  } catch (e) {
    console.error("[arrange-prompt]", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
