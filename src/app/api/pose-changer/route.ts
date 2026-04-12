import OpenAI, { toFile } from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const maxRequestBodySize = "20mb";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function resizeTo1024(base64: string): Promise<Buffer> {
  const src = Buffer.from(base64, "base64");
  const meta = await sharp(src).metadata();
  const w = meta.width ?? 1024;
  const h = meta.height ?? 1024;
  const size = Math.min(Math.max(w, h), 1024);
  return sharp(src).resize(size, size, { fit: "cover", position: "centre" }).png().toBuffer();
}

type CharacterAnalysis = {
  artStyle: string;
  face: string;
  hair: string;
  skinTone: string;
  outfit: string;
  accessories: string;
  shadingStyle: string;
};

async function analyzeCharacter(
  base64: string,
  mediaType: string
): Promise<CharacterAnalysis> {
  const res = await claude.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 800,
    system: "Return JSON only. No explanation.",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: base64,
            },
          },
          {
            type: "text",
            text:
              "Analyze this character image with extreme precision. Return a JSON object with these exact keys:\n" +
              "- artStyle: art style (e.g. 'anime cel-shaded', 'watercolor illustration', 'realistic digital painting')\n" +
              "- face: detailed face description (eye shape, eye color, iris style, nose shape, mouth/lips, face shape, any markings)\n" +
              "- hair: hair color (exact shade), length, style, texture, any special features\n" +
              "- skinTone: exact skin tone description\n" +
              "- outfit: every clothing item with colors, patterns, materials (top, bottom, shoes, etc.)\n" +
              "- accessories: all accessories (earrings, necklace, bag, hat, etc.) or 'none'\n" +
              "- shadingStyle: shading and line art style (e.g. 'thick black outlines, flat cel shading', 'no outlines, soft gradients')",
          },
        ],
      },
    ],
  });

  const raw = res.content[0].type === "text" ? res.content[0].text : "{}";
  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    return {
      artStyle: raw,
      face: "",
      hair: "",
      skinTone: "",
      outfit: "",
      accessories: "",
      shadingStyle: "",
    };
  }
}

function buildPrompt(
  analysis: CharacterAnalysis,
  poseText: string,
  hasPoseRef: boolean
): string {
  const charDesc = [
    `Art style: ${analysis.artStyle}`,
    `Face: ${analysis.face}`,
    `Hair: ${analysis.hair}`,
    `Skin tone: ${analysis.skinTone}`,
    `Outfit: ${analysis.outfit}`,
    analysis.accessories !== "none" ? `Accessories: ${analysis.accessories}` : "",
    `Shading style: ${analysis.shadingStyle}`,
  ].filter(Boolean).join(". ");

  return (
    "Image 1 = character identity reference. " +
    (hasPoseRef ? "Image 2 = pose reference (use ONLY for body position, ignore its style/appearance). " : "") +
    "TASK: Redraw the character from Image 1 in a new pose. " +
    "CHANGE ONLY: body pose and limb positions. " +
    "DO NOT CHANGE — must be pixel-identical in style: " +
    "face (eye shape, eye color, nose, mouth), hair (color, length, style), " +
    "skin tone, outfit (every clothing item, colors, patterns), accessories, art style, shading style. " +
    `New pose: ${poseText}. ` +
    `Character reference details: ${charDesc}.`
  );
}

export async function POST(req: NextRequest) {
  try {
    const {
      characterBase64,
      characterMediaType = "image/jpeg",
      poseText,
      poseRefBase64,
      poseRefMediaType = "image/jpeg",
      count = 2,
    } = await req.json() as {
      characterBase64: string;
      characterMediaType?: string;
      poseText: string;
      poseRefBase64?: string;
      poseRefMediaType?: string;
      count?: number;
    };

    if (!characterBase64) return NextResponse.json({ error: "No character image" }, { status: 400 });
    if (!poseText) return NextResponse.json({ error: "No pose description" }, { status: 400 });

    // Step 1: Claude でキャラクター詳細解析
    const analysis = await analyzeCharacter(characterBase64, characterMediaType);
    console.log("[pose-changer] analysis:", analysis);

    // Step 2: プロンプト構築
    const prompt = buildPrompt(analysis, poseText, !!poseRefBase64);
    console.log("[pose-changer] prompt:", prompt);

    // Step 3: 画像を準備
    const charBuf = await resizeTo1024(characterBase64);
    const charFile = await toFile(charBuf, "character.png", { type: "image/png" });

    const images: Parameters<typeof openai.images.edit>[0]["image"] = [charFile];
    if (poseRefBase64) {
      const refBuf = await resizeTo1024(poseRefBase64);
      const refFile = await toFile(refBuf, "pose-ref.png", { type: "image/png" });
      images.push(refFile);
    }

    // Step 4: gpt-image-1 で生成（count 枚並列）
    const n = Math.min(Math.max(Number(count), 1), 4);
    const results = await Promise.all(
      Array.from({ length: n }, async () => {
        try {
          const res = await openai.images.edit({
            model: "gpt-image-1",
            image: images,
            prompt,
            n: 1,
            size: "1024x1024",
          });
          const b64 = res.data?.[0]?.b64_json;
          return b64 ? `data:image/png;base64,${b64}` : null;
        } catch (e) {
          console.error("[pose-changer gen error]", e);
          return null;
        }
      })
    );

    const urls = results.filter(Boolean);
    return NextResponse.json({ urls, analysis, prompt });
  } catch (e) {
    console.error("[pose-changer]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
