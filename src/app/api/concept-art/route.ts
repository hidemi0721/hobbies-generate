import OpenAI, { toFile } from "openai";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const maxRequestBodySize = "20mb";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type Mode = "single" | "layers";

export type Selections = {
  lighting?: string;
  colorTone?: string;
  atmosphere?: string;
};

const LIGHTING_PROMPTS: Record<string, string> = {
  overcast: "soft overcast daylight, diffused even illumination, cool shadows, no harsh highlights",
  golden: "warm golden hour sunlight, long soft shadows, rim lighting on subjects, rich amber glow across the scene",
  night: "night scene with glowing artificial light sources, deep surrounding darkness, warm light halos, dramatic contrast between lit and dark areas",
  dusk: "twilight dusk atmosphere, blue-purple gradient sky, silhouetted foreground elements, fading ambient light",
};

const COLOR_PROMPTS: Record<string, string> = {
  neutral: "neutral desaturated color palette, cool-to-neutral white balance, no yellow or warm cast, natural tones with slightly reduced saturation",
  warm: "warm amber and orange tones throughout, lifted shadows with warm color, teal-orange split toning",
  cool: "cool teal-blue color grading, shadows shifted to deep teal-green, highlights kept neutral to slightly warm",
  mono: "black and white conversion, high contrast monochrome, rich deep blacks and luminous greys",
};

const ATMOSPHERE_PROMPTS: Record<string, string> = {
  silent: "quiet mysterious atmosphere, absolute stillness, contemplative and melancholic mood, shallow depth of field",
  mist: "atmospheric haze filling mid and far distance, soft misty depth, background details softened by mist",
  rain: "wet glistening surfaces with reflections, rain atmosphere, moisture in air, puddle reflections on ground",
  neon: "neon light reflections, glowing signs and electric urban atmosphere, light pollution casting colored glows",
};

const BASE_PROMPT =
  "Restyle this photograph with a cinematic Japanese photography aesthetic. " +
  "Preserve exactly the composition, subjects, framing, and all elements of the original photo — do not add or remove anything. " +
  "Maintain the original exposure level — do NOT darken or underexpose the image. " +
  "Apply: controlled contrast with shadow detail preserved, subtle atmospheric depth, muted and selectively saturated color palette, " +
  "film-like quality with subtle grain, layered sense of distance. " +
  "Color temperature: cool to neutral — lean slightly blue-cool, suppress any yellow or amber tint. " +
  "The result must look like a high-quality cinematic photograph — NOT an illustration or painting.";

const LAYER_CONFIGS = [
  {
    key: "near",
    label: "近景",
    instruction:
      "Focus rendering detail on FOREGROUND elements only (nearest 0–5 meters). " +
      "Midground and background should recede into soft darkness or haze. ",
  },
  {
    key: "mid",
    label: "中景",
    instruction:
      "Focus rendering detail on MIDGROUND elements only (5–50 meters). " +
      "Foreground should be dark and out of focus, background should fade into atmospheric haze. ",
  },
  {
    key: "far",
    label: "遠景",
    instruction:
      "Focus rendering detail on BACKGROUND/FAR elements only (50m and beyond: sky, distant structures, horizon). " +
      "Foreground and midground should be deeply shadowed and indistinct. ",
  },
];

function buildStyleSuffix(sel: Selections): string {
  const parts: string[] = [];
  if (sel.lighting && LIGHTING_PROMPTS[sel.lighting]) parts.push(LIGHTING_PROMPTS[sel.lighting]);
  if (sel.colorTone && COLOR_PROMPTS[sel.colorTone]) parts.push(COLOR_PROMPTS[sel.colorTone]);
  if (sel.atmosphere && ATMOSPHERE_PROMPTS[sel.atmosphere]) parts.push(ATMOSPHERE_PROMPTS[sel.atmosphere]);
  return parts.length ? " Emphasis: " + parts.join("; ") + "." : "";
}

async function prepareImage(base64: string): Promise<Buffer> {
  const src = Buffer.from(base64, "base64");
  const meta = await sharp(src).metadata();
  const w = meta.width ?? 1024;
  const h = meta.height ?? 1024;
  const size = Math.min(Math.max(w, h), 1024);
  return sharp(src).resize(size, size, { fit: "cover", position: "centre" }).png().toBuffer();
}

// gpt-image-1の黄ばみ癖をsharpで後補正（warm/golden選択時はスキップ）
async function applyCoolCorrection(b64: string, skip: boolean): Promise<string> {
  if (skip) return `data:image/png;base64,${b64}`;
  const buf = Buffer.from(b64, "base64");
  const corrected = await sharp(buf)
    .recomb([
      [0.91, 0.06, 0.03], // red を少し抑制
      [0.00, 1.00, 0.00], // green はそのまま
      [0.01, 0.03, 1.08], // blue を少し強化
    ])
    .png()
    .toBuffer();
  return `data:image/png;base64,${corrected.toString("base64")}`;
}

async function generate(imageBuf: Buffer, prompt: string, skipCoolCorrection = false): Promise<string> {
  const file = await toFile(imageBuf, "photo.png", { type: "image/png" });
  const res = await openai.images.edit({
    model: "gpt-image-1",
    image: file,
    prompt,
  });
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI returned no image data");
  return applyCoolCorrection(b64, skipCoolCorrection);
}

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, imageMediaType: _mt, selections = {}, mode = "single" } =
      await req.json() as {
        imageBase64: string;
        imageMediaType?: string;
        selections?: Selections;
        mode?: Mode;
      };

    if (!imageBase64 || imageBase64.length < 100) {
      return NextResponse.json({ error: "画像データが不正です。別の画像を試してください。" }, { status: 400 });
    }

    // base64文字以外が含まれていないか確認
    if (!/^[A-Za-z0-9+/=]+$/.test(imageBase64)) {
      return NextResponse.json({ error: "画像データの形式が正しくありません。" }, { status: 400 });
    }

    let imageBuf: Buffer;
    try {
      imageBuf = await prepareImage(imageBase64);
    } catch (e) {
      console.error("[concept-art prepareImage error]", e);
      return NextResponse.json({ error: "画像の処理に失敗しました。JPEGまたはPNG画像を使用してください。" }, { status: 400 });
    }
    const styleSuffix = buildStyleSuffix(selections);
    const skipCool = selections.colorTone === "warm" || selections.lighting === "golden";

    if (mode === "layers") {
      const results = await Promise.all(
        LAYER_CONFIGS.map(async (cfg) => {
          const prompt = BASE_PROMPT + " " + cfg.instruction + styleSuffix;
          try {
            const url = await generate(imageBuf, prompt, skipCool);
            return { key: cfg.key, label: cfg.label, url };
          } catch (e) {
            console.error(`[concept-art layer ${cfg.key}]`, e);
            return { key: cfg.key, label: cfg.label, url: null };
          }
        })
      );
      return NextResponse.json({ layers: results });
    }

    const url = await generate(imageBuf, BASE_PROMPT + styleSuffix, skipCool);
    return NextResponse.json({ url });
  } catch (e) {
    console.error("[concept-art]", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
