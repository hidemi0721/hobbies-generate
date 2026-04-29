export function getOpenAiApiKey(): string {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "OPENAI_API_KEY が未設定です。https://platform.openai.com/api-keys でキーを発行し、.env.local に設定してください。"
    );
  }
  return key;
}

type TextContent = { type: "text"; text: string };
type ImageContent = { type: "image_url"; image_url: { url: string } };
type MessageContent = TextContent | ImageContent;

export type HfMessage =
  | { role: "system" | "user" | "assistant"; content: string }
  | { role: "user"; content: MessageContent[] };

type ChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

export async function hfChat(
  messages: HfMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const key = getOpenAiApiKey();
  const model = process.env.OPENAI_MODEL?.trim() ?? "gpt-4o-mini";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options?.temperature ?? 0.75,
      max_tokens: options?.maxTokens ?? 2048,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  const data = (await res.json()) as ChatResponse;

  if (!res.ok) {
    throw new Error(
      `OpenAI API エラー (${res.status}): ${data.error?.message ?? JSON.stringify(data)}`
    );
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI から応答がありませんでした。");
  return content;
}

export async function hfChatVision(
  systemPrompt: string,
  userText: string,
  imageBase64: string,
  imageMimeType: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const key = getOpenAiApiKey();
  const model = process.env.OPENAI_VISION_MODEL?.trim() ?? "gpt-4o-mini";

  const messages: HfMessage[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: {
            url: `data:${imageMimeType};base64,${imageBase64}`,
          },
        },
        { type: "text", text: userText },
      ],
    },
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options?.temperature ?? 0.75,
      max_tokens: options?.maxTokens ?? 2048,
    }),
    signal: AbortSignal.timeout(90_000),
  });

  const data = (await res.json()) as ChatResponse;

  if (!res.ok) {
    throw new Error(
      `OpenAI Vision API エラー (${res.status}): ${data.error?.message ?? JSON.stringify(data)}`
    );
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI から応答がありませんでした。");
  return content;
}
