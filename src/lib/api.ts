const BASE = import.meta.env.VITE_AI_BASE_URL ?? "http://localhost:8423/v1"

// ── Types ──────────────────────────────────────────────────────────────────────

interface ExplainResponse {
  explanation: string;
}

interface GenerateResponse {
  query: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string
}

interface ChatCompletionResponse {
  message: ChatMessage
}

// ── SQL explain ────────────────────────────────────────────────────────────────

export async function explainQuery(sql: string): Promise<string> {
  const res = await fetch(`${BASE}/sql/explanations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  })
  if (!res.ok) throw new Error(`AI error: ${res.status}`)
  const data: ExplainResponse = await res.json()
  return data.explanation
}

// ── SQL generation ─────────────────────────────────────────────────────────────

export async function generateQuery(prompt: string, schema: unknown): Promise<string> {
  const res = await fetch(`${BASE}/sql/generations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, schema_context: JSON.stringify(schema) }),
  })
  if (!res.ok) throw new Error(`AI error: ${res.status}`)
  const data: GenerateResponse = await res.json()
  return data.query
}

// ── Chat completions ───────────────────────────────────────────────────────────

export async function chatCompletion(messages: ChatMessage[]): Promise<ChatMessage> {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  })
  if (!res.ok) throw new Error(`AI error: ${res.status}`)
  const data: ChatCompletionResponse = await res.json()
  return data.message
}
