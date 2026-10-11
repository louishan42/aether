const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const RETIRED = new Set(["llama-3.1-8b-instant", "llama-3.3-70b-versatile"]);
const DEFAULT_MODEL = "openai/gpt-oss-20b";

export function groqReady() {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

function modelId() {
  const wanted = process.env.GROQ_MODEL?.trim() || DEFAULT_MODEL;
  return RETIRED.has(wanted) ? DEFAULT_MODEL : wanted;
}

export async function groqReply(system: string, user: string) {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) return null;

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelId(),
      temperature: 0.3,
      max_tokens: 280,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(body.slice(0, 180) || `Groq ${res.status}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  return text || null;
}
