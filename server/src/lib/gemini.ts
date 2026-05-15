import { GoogleGenerativeAI } from "@google/generative-ai";

const MAX_TEXT_CHARS = 10_000;

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server");
  }
  return new GoogleGenerativeAI(apiKey);
}

export function truncateManuscriptText(text: string): string {
  if (text.length <= MAX_TEXT_CHARS) return text;
  console.warn(
    `Manuscript text truncated from ${text.length} to ${MAX_TEXT_CHARS} characters`,
  );
  return text.slice(0, MAX_TEXT_CHARS);
}

export async function generateJson<T>(prompt: string): Promise<T> {
  const model = getClient().getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent(prompt);
  const raw = result.response.text();
  return JSON.parse(raw) as T;
}

export async function generateText(
  systemInstruction: string,
  messages: { role: "user" | "model"; text: string }[],
): Promise<string> {
  const model = getClient().getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    systemInstruction,
  });

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));

  const last = messages[messages.length - 1];
  if (!last) {
    throw new Error("No messages provided to Gemini");
  }

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(last.text);
  return result.response.text();
}
