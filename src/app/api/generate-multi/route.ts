import OpenAI, { toFile } from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/auth";
import fs from "fs";
import path from "path";
import sharp from "sharp";

export const maxRequestBodySize = "20mb";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function loadBase64(filename: string): string | null {
  const p = path.join(process.cwd(), "public", filename);
  return fs.existsSync(p) ? fs.readFileSync(p).toString("base64") : null;
}
const STYLE_REF_0 = loadBase64("style-ref-0.jpg");
const STYLE_REF_1 = loadBase64("style-ref-1.jpg");
const STYLE_REF_BASE = loadBase64("style-ref-base.jpg");

const MOOD_VARIANTS = [
  "identical camera angle and framing",
  "same composition, slightly tighter crop",
  "same composition, slightly wider crop",
  "same composition, slightly lower camera angle",
  "same composition, slightly higher camera angle",
];

async function translateToEnglish(text: string): Promise<string> {
  const res = await claude.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    system:
      "Translate the following Japanese image description into concise English focusing on composition, camera angle, pose, and spatial layout. Return only the translated text.",
    messages: [{ role: "user", content: text }],
  });
  return res.content[0].type === "text" ? res.content[0].text : text;
}

// gpt-image-1でアップロード画像を直接参照して生成
// gpt-image-1 対応サイズにマップ
function toGptSize(size: string): "1024x1024" | "1024x1536" | "1536x1024" {
  if (size === "1024x1536" || size === "768x1344") return "1024x1536";
  if (size === "1536x1024" || size === "1344x768") return "1536x1024";
  return "1024x1024";
}

// DALL-E 3 対応サイズにマップ
function toDalleSize(size: string): "1024x1024" | "1024x1792" | "1792x1024" {
  if (size === "1024x1536" || size === "768x1344") return "1024x1792";
  if (size === "1536x1024" || size === "1344x768") return "1792x1024";
  return "1024x1024";
}

// 元画像を対象サイズにパディング（余白はオーバーペイント用に白）
async function padImageToSize(
  sourceBase64: string,
  gptSize: "1024x1024" | "1024x1536" | "1536x1024"
): Promise<{ paddedBuf: Buffer; hasPadding: boolean }> {
  const [targetW, targetH] = gptSize.split("x").map(Number);
  const srcBuf = Buffer.from(sourceBase64, "base64");
  const meta = await sharp(srcBuf).metadata();
  const srcW = meta.width!;
  const srcH = meta.height!;

  // ソースと対象の比率が同じならそのままリサイズ
  const srcRatio = srcW / srcH;
  const tgtRatio = targetW / targetH;
  const hasPadding = Math.abs(srcRatio - tgtRatio) > 0.01;

  if (!hasPadding) {
    const resized = await sharp(srcBuf).resize(targetW, targetH).png().toBuffer();
    return { paddedBuf: resized, hasPadding: false };
  }

  // 元画像をターゲット内に収まる最大サイズにリサイズ（中央配置）
  const scale = Math.min(targetW / srcW, targetH / srcH);
  const placedW = Math.round(srcW * scale);
  const placedH = Math.round(srcH * scale);
  const offsetX = Math.round((targetW - placedW) / 2);
  const offsetY = Math.round((targetH - placedH) / 2);

  const resized = await sharp(srcBuf).resize(placedW, placedH).png().toBuffer();
  const padded = await sharp({
    create: { width: targetW, height: targetH, channels: 3, background: { r: 255, g: 255, b: 255 } },
  })
    .composite([{ input: resized, left: offsetX, top: offsetY }])
    .png()
    .toBuffer();

  return { paddedBuf: padded, hasPadding: true };
}

async function generateWithImageRef(
  targetBase64: string,
  targetMediaType: string,
  variant: string,
  imageSize: string
): Promise<string | null> {
  try {
    const gptSize = toGptSize(imageSize);
    const { paddedBuf, hasPadding } = await padImageToSize(targetBase64, gptSize);
    const targetFile = await toFile(paddedBuf, "target.png", { type: "image/png" });

    const images: Parameters<typeof openai.images.edit>[0]["image"] = [targetFile];

    if (STYLE_REF_0) {
      const buf = Buffer.from(STYLE_REF_0, "base64");
      images.push(await toFile(buf, "style0.jpg", { type: "image/jpeg" }));
    }
    if (STYLE_REF_1) {
      const buf = Buffer.from(STYLE_REF_1, "base64");
      images.push(await toFile(buf, "style1.jpg", { type: "image/jpeg" }));
    }

    const outpaintNote = hasPadding
      ? "IMPORTANT: Image 1 has white padding areas around the original content. " +
        "Naturally extend and overpaint the white padding areas with appropriate background content " +
        "that seamlessly continues the scene — maintaining the same perspective, environment, and atmosphere. "
      : "";

    const prompt =
      "Image 1 = COMPOSITION REFERENCE. Image 2 and 3 = STYLE REFERENCES. " +
      "Redraw the scene from Image 1 using the style of Image 2 and 3. " +
      outpaintNote +

      "CAMERA WORK — reproduce with pixel-perfect accuracy from Image 1: " +
      "exact shot type (extreme close-up / close-up / medium / full-body / wide), " +
      "exact camera height and angle (eye-level / low-angle / high-angle / bird's-eye), " +
      "exact camera distance and how much of the subject fills the frame, " +
      "exact perspective distortion and field of view, " +
      "exact subject position within the frame (center / left / right / foreground / background). " +

      "POSE — reproduce exactly from Image 1: " +
      "body rotation, weight distribution, every limb angle, hand and finger positions. " +

      "STYLE (from Image 2 and 3): " +
      "featureless flat-grey (#C0C0C0) mannequin figure, completely bald, no hair, no clothing, no facial details, " +
      "thin uniform black lines, pure white background, no shading no color no texture. " +
      "NO TEXT — do not include any letters, words, numbers, logos, watermarks, or typography anywhere in the image. " +

      `Variation: ${variant}.`;

    console.log(`[gpt-image-1 prompt]\n${prompt}\n`);

    const response = await openai.images.edit({
      model: "gpt-image-1",
      image: images,
      prompt,
      n: 1,
      size: gptSize,
    });

    const b64 = response.data?.[0]?.b64_json;
    return b64 ? `data:image/png;base64,${b64}` : null;
  } catch (e) {
    console.error("[gpt-image-1 error]", e);
    return null;
  }
}

// フォールバック: DALL-E 3 テキストのみ
async function generateWithDalle(
  englishPrompt: string,
  variant: string,
  imageSize: string,
  targetBase64?: string,
  targetMediaType?: string
): Promise<string | null> {
  const imageBlocks: Anthropic.ImageBlockParam[] = [];
  if (STYLE_REF_0)
    imageBlocks.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: STYLE_REF_0 } });
  if (STYLE_REF_1)
    imageBlocks.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: STYLE_REF_1 } });
  if (targetBase64)
    imageBlocks.push({
      type: "image",
      source: {
        type: "base64",
        media_type: (targetMediaType || "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
        data: targetBase64,
      },
    });

  const hasTarget = !!targetBase64;
  const userContent: Anthropic.ContentBlockParam[] = [
    ...imageBlocks,
    {
      type: "text",
      text: `${hasTarget ? "image_0=style ref, image_1=style ref, image_2=composition target." : "image_0=style ref, image_1=style ref."}
Write a DALL-E 3 prompt. Start with camera specs: shot type, angle, height, distance.
Style: minimalist line-art, flat-grey mannequin figure, white background, monochrome.
Composition: ${hasTarget ? "reproduce exactly from image_2" : englishPrompt}. Variation: ${variant}.
Return prompt text only.`,
    },
  ];

  const res = await claude.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    system: "Expert DALL-E 3 prompt writer. Begin every prompt with camera specs. Return prompt text only.",
    messages: [{ role: "user", content: userContent }],
  });

  const dallePrompt = res.content[0].type === "text" ? res.content[0].text : englishPrompt;
  console.log(`[DALL-E prompt]\n${dallePrompt}\n`);

  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: dallePrompt,
    n: 1,
    size: toDalleSize(imageSize),
    style: "natural",
  });
  return response.data?.[0]?.url ?? null;
}

export async function POST(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  try {
    const { prompt, count = 4, imageBase64, imageMediaType, imageSize = "1024x1024" } = await req.json();
    if (!prompt) return NextResponse.json({ error: "No prompt" }, { status: 400 });
    console.log(`[generate-multi] imageBase64: ${imageBase64 ? `${imageBase64.length} chars` : "NONE — image not received"}`);

    const hasJapanese = /[\u3040-\u30ff\u4e00-\u9faf]/.test(prompt);
    const englishPrompt = hasJapanese ? await translateToEnglish(prompt) : prompt;

    const n = Math.min(Math.max(Number(count), 1), 5);

    const results = await Promise.all(
      Array.from({ length: n }, async (_, i) => {
        const variant = MOOD_VARIANTS[i % MOOD_VARIANTS.length];
        // 画像がある場合はgpt-image-1で直接参照、なければDALL-E 3
        if (imageBase64) {
          const url = await generateWithImageRef(imageBase64, imageMediaType || "image/jpeg", variant, imageSize);
          if (url) return url;
        }
        return generateWithDalle(englishPrompt, variant, imageSize, imageBase64, imageMediaType);
      })
    );

    const urls = results.filter(Boolean);
    return NextResponse.json({ urls });
  } catch (e) {
    console.error("[generate-multi]", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
