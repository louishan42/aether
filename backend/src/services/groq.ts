const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export function groqReady() {
  return Boolean(process.env.GROQ_API_KEY?.trim());
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
      model: process.env.GROQ_MODEL?.trim() || "llama-3.1-8b-instant",
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
