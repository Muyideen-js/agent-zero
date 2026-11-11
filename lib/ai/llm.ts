import "server-only";

/**
 * Minimal OpenAI-compatible chat client. Defaults to NEAR AI Cloud; any
 * compatible endpoint works by setting AI_BASE_URL / AI_MODEL / AI_API_KEY.
 */
const BASE = (process.env.AI_BASE_URL ?? "https://cloud-api.near.ai/v1").replace(/\/$/, "");
const MODEL = process.env.AI_MODEL ?? "deepseek-ai/DeepSeek-V3.1";
const KEY = process.env.AI_API_KEY ?? "";

export const aiConfigured = () => Boolean(KEY);
export const aiModel = () => MODEL;

export async function chat(system: string, user: string, opts: { json?: boolean; maxTokens?: number } = {}): Promise<string> {
  if (!KEY) throw new Error("AI is not configured. Set AI_API_KEY in .env.local (see SETUP.md).");
  const body = JSON.stringify({
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    max_tokens: opts.maxTokens ?? 2500,
    temperature: 0.4,
    // Reasoning models spend tokens thinking; keep it light so free-tier limits go further.
    ...(/gpt-oss|qwen3|deepseek-r1/i.test(MODEL) ? { reasoning_effort: "low" } : {}),
    ...(opts.json ? { response_format: { type: "json_object" } } : {}),
  });

  // Free tiers rate-limit by tokens per minute: wait as instructed and retry.
  let res: Response | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    res = await fetch(`${BASE}/chat/completions`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` }, body });
    if (res.status !== 429) break;
    const text = await res.text();
    const hinted = Number(res.headers.get("retry-after")) || Number(text.match(/try again in ([\d.]+)s/)?.[1]) || 10;
    await new Promise((r) => setTimeout(r, Math.min(45, hinted + 1) * 1000));
  }
  if (!res || !res.ok) throw new Error(`Model request failed (${res?.status}): ${(await res?.text())?.slice(0, 300)}`);
  const json = await res.json();
  const content: string | undefined = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Model returned no content");
  return content;
}

/** Extracts the first JSON object from a model reply (tolerates code fences). */
export function parseJson<T>(text: string): T {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Model reply was not JSON");
  return JSON.parse(text.slice(start, end + 1)) as T;
}
