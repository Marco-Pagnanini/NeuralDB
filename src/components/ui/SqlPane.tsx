import { useState } from "react"
import { Play, Plus, MoreHorizontal, PanelBottomClose, X } from "lucide-react"
import { Button } from "./Button"
import { MOCK_QUERY_RESULTS } from "../../data/mockDb"

type ResultTab = "results" | "logs" | "issues"

/* ── SQL tokens for basic highlight ─────────────────── */
function SqlLine({ children }: { children: string }) {
  const keywords = /\b(SELECT|FROM|WHERE|AND|OR|ORDER BY|ORDER|BY|LIMIT|JOIN|LEFT|INNER|ON|AS|DISTINCT|GROUP|HAVING|INSERT|UPDATE|DELETE|CREATE|TABLE|INDEX|DROP|ALTER)\b/gi
  const strings  = /('[^']*')/g
  const numbers  = /\b(\d+(\.\d+)?)\b/g

  const parts: React.ReactNode[] = []
  let last = 0
  const text = children

  // Very simple tokenizer – one pass with regex exec loop
  const allMatches: { index: number; length: number; type: "kw" | "str" | "num"; value: string }[] = []

  let m: RegExpExecArray | null
  const kwRe = new RegExp(keywords.source, "gi")
  while ((m = kwRe.exec(text)) !== null)
    allMatches.push({ index: m.index, length: m[0].length, type: "kw", value: m[0] })

  const strRe = new RegExp(strings.source, "g")
  while ((m = strRe.exec(text)) !== null)
    allMatches.push({ index: m.index, length: m[0].length, type: "str", value: m[0] })

  const numRe = new RegExp(numbers.source, "g")
  while ((m = numRe.exec(text)) !== null)
    allMatches.push({ index: m.index, length: m[0].length, type: "num", value: m[0] })

  allMatches.sort((a, b) => a.index - b.index)

  // deduplicate overlaps
  const deduped: typeof allMatches = []
  let cursor = 0
  for (const tok of allMatches) {
    if (tok.index >= cursor) { deduped.push(tok); cursor = tok.index + tok.length }
  }

  last = 0
  for (const tok of deduped) {
    if (tok.index > last) parts.push(<span key={last}>{text.slice(last, tok.index)}</span>)
    const color = tok.type === "kw" ? "#c084fc" : tok.type === "str" ? "#86efac" : "#fb923c"
    parts.push(<span key={tok.index} style={{ color }}>{tok.value}</span>)
    last = tok.index + tok.length
  }
  if (last < text.length) parts.push(<span key={last}>{text.slice(last)}</span>)

  return <div style={{ lineHeight: 1.7 }}>{parts}</div>
}

const SQL_LINES = [
  "SELECT u.id, u.username, u.role",
  "FROM users u",
  "JOIN projects p ON p.assigned_designer = u.user_id",
  "JOIN services s ON s.service_id = p.service_id",
  "WHERE",
  "  s.base_price >= 500",
  "  AND (u.role = 'Designer' OR u.role = 'Creative Director')",
  "ORDER BY s.base_price DESC",
  "LIMIT 10;",
]

export function SqlPane() {
  const [tab, setTab] = useState<ResultTab>("results")
  const { columns, rows } = MOCK_QUERY_RESULTS

  return (
    <div style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      background: "var(--bg1)",
      borderTop: "1px solid var(--border1)",
      overflow: "hidden",
    }}>
      {/* ── Editor area ── */}
      <div style={{
        flex: "0 0 auto",
        borderBottom: "1px solid var(--border1)",
      }}>
        {/* label */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 12px",
          borderBottom: "1px solid var(--border1)",
        }}>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 500, color: "var(--text2)" }}>
            Schema Console
          </span>
        </div>

        {/* SQL code */}
        <div style={{
          padding: "8px 14px",
          fontFamily: "var(--font-mono)",
          fontSize: 11.5,
          color: "var(--text2)",
          lineHeight: 1.6,
          overflowY: "auto",
          maxHeight: 110,
        }}>
          {SQL_LINES.map((line, i) => (
            <SqlLine key={i}>{line}</SqlLine>
          ))}
        </div>
      </div>

      {/* ── Results area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* tab bar */}
        <div style={{
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid var(--border1)",
          background: "var(--bg2)",
          padding: "0 8px",
          gap: 2,
        }}>
          {(["results", "logs", "issues"] as ResultTab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                fontWeight: tab === t ? 500 : 400,
                color: tab === t ? "var(--text1)" : "var(--text3)",
                padding: "6px 10px",
                background: "transparent",
                border: "none",
                borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
                cursor: "pointer",
                transition: "color 0.1s",
              }}
            >
              {t === "results" ? "Query Results" : t === "logs" ? "System Logs" : "Schema Issues"}
            </button>
          ))}

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 2 }}>
            <Button variant="ghost" size="icon" aria-label="Add"><Plus size={12} /></Button>
            <Button variant="ghost" size="icon" aria-label="More"><MoreHorizontal size={12} /></Button>
            <Button variant="ghost" size="icon" aria-label="Split"><PanelBottomClose size={12} /></Button>
            <Button variant="ghost" size="icon" aria-label="Close"><X size={12} /></Button>
          </div>
        </div>

        {/* results table */}
        {tab === "results" && (
          <div style={{ flex: 1, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg2)", position: "sticky", top: 0 }}>
                  {columns.map(col => (
                    <th key={col} style={{
                      padding: "5px 14px",
                      textAlign: "left",
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      fontWeight: 500,
                      color: "var(--text3)",
                      letterSpacing: "0.05em",
                      borderBottom: "1px solid var(--border1)",
                      whiteSpace: "nowrap",
                    }}>
                      {col.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={i}
                    style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.012)" }}
                  >
                    {row.map((cell, j) => (
                      <td key={j} style={{
                        padding: "4px 14px",
                        fontFamily: "var(--font-sans)",
                        fontSize: 12,
                        color: typeof cell === "number" ? "#fb923c" : "var(--text1)",
                        borderBottom: "1px solid var(--border1)",
                        whiteSpace: "nowrap",
                      }}>
                        {String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* status bar */}
            <div style={{
              padding: "5px 14px",
              display: "flex",
              alignItems: "center",
              gap: 6,
              borderTop: "1px solid var(--border1)",
            }}>
              <span style={{ fontSize: 10, color: "#22c55e", fontFamily: "var(--font-sans)" }}>✓</span>
              <span style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--font-sans)" }}>
                {rows.length} rows returned. Executed in 2.26 ms.
              </span>
            </div>
          </div>
        )}

        {tab === "logs" && (
          <div style={{ padding: 14, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text3)" }}>
            No system logs.
          </div>
        )}

        {tab === "issues" && (
          <div style={{ padding: 14, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text3)" }}>
            No schema issues detected.
          </div>
        )}
      </div>
    </div>
  )
}
