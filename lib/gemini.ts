import { GoogleGenerativeAI } from "@google/generative-ai";

export function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY が未設定です。Google AI Studio（https://aistudio.google.com/apikey）で無料の API キーを発行し、.env.local に設定してください。"
    );
  }
  return key;
}

export function getGeminiModel() {
  const key = getGeminiApiKey();
  const name = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
  const genAI = new GoogleGenerativeAI(key);
  return genAI.getGenerativeModel({
    model: name,
    systemInstruction:
      "あなたは音楽制作のアシスタントです。指示された JSON スキーマにだけ従い、有効な JSON のみを出力します。説明文やマークダウンは付けません。日本語で書きます。",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.75,
    },
  });
}
