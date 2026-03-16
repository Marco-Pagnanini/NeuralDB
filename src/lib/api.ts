const BASE = import.meta.env.VITE_AI_BASE_URL ?? "http://localhost:8000"

interface ExplainResponse {
  explanation: string;
}

interface GenerateResponse {
  sql: string;
}

export async function explainQuery(sql: string): Promise<string> {
  const res = await fetch(`${BASE}/ai/query-explanations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sql }),
  })
  
  if (!res.ok) throw new Error(`AI error: ${res.status}`)
  
  const data: ExplainResponse = await res.json()
  return data.explanation
}

export async function generateQuery(prompt: string, schema: unknown): Promise<string> {
  const res = await fetch(`${BASE}/ai/generated-queries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, schema }),
  })
  
  if (!res.ok) throw new Error(`AI error: ${res.status}`)
  
  const data: GenerateResponse = await res.json()
  return data.sql
}