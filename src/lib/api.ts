const BASE = import.meta.env.VITE_AI_BASE_URL ?? "http://localhost:8423/v1"

interface ExplainResponse {
  explanation: string;
}

interface GenerateResponse {
  query: string;
}

export async function explainQuery(sql: string): Promise<string> {
  const res = await fetch(`${BASE}/sql/explanations`,  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  })

  if (!res.ok) throw new Error(`AI error: ${res.status}`)

  const data: ExplainResponse = await res.json()
  return data.explanation
}

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
