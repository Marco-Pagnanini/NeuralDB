import { useState } from "react"
import { Table2, KeyRound, Link2, Columns3, Plus } from "lucide-react"
import type { TableDef } from "../../data/mockDb"

type Tab = "columns" | "statement" | "deps"

interface TableCardProps {
  table: TableDef
  selected?: boolean
  onSelect?: () => void
}

export function TableCard({ table, selected, onSelect }: TableCardProps) {
  const [tab, setTab] = useState<Tab>("columns")

  return (
    <div
      onClick={onSelect}
      style={{
        position: "absolute",
        left: table.x,
        top: table.y,
        width: 280,
        background: "var(--bg2)",
        border: `1px solid ${selected ? table.color + "80" : "var(--border2)"}`,
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: selected
          ? `0 0 0 2px ${table.color}30, 0 8px 24px rgba(0,0,0,0.4)`
          : "0 4px 16px rgba(0,0,0,0.35)",
        cursor: "pointer",
        userSelect: "none",
        transition: "box-shadow 0.15s, border-color 0.15s",
      }}
    >
      {/* ── Header ── */}
      <div style={{
        background: table.color,
        padding: "7px 10px",
        display: "flex",
        alignItems: "center",
        gap: 7,
      }}>
        <Table2 size={13} color="#fff" style={{ flexShrink: 0 }} />
        <span style={{
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          fontWeight: 600,
          color: "#fff",
          flex: 1,
          letterSpacing: "-0.01em",
        }}>
          {table.name}
        </span>
        <button
          onClick={e => e.stopPropagation()}
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "none",
            borderRadius: 4,
            width: 20,
            height: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <Plus size={11} color="#fff" />
        </button>
      </div>

      {/* ── Tab bar ── */}
      <div style={{
        display: "flex",
        borderBottom: "1px solid var(--border1)",
        background: "var(--bg1)",
      }}>
        {(["columns", "statement", "deps"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={e => { e.stopPropagation(); setTab(t) }}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 10,
              fontWeight: tab === t ? 500 : 400,
              color: tab === t ? "var(--text1)" : "var(--text3)",
              padding: "5px 10px",
              background: "transparent",
              border: "none",
              borderBottom: tab === t ? `2px solid ${table.color}` : "2px solid transparent",
              cursor: "pointer",
              letterSpacing: "0.01em",
              transition: "color 0.1s",
            }}
          >
            {t === "columns"   ? "Columns"          : null}
            {t === "statement" ? "Create Statement" : null}
            {t === "deps"      ? "Dependencies"     : null}
          </button>
        ))}
      </div>

      {/* ── Columns tab ── */}
      {tab === "columns" && (
        <div>
          {/* header row */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 40px",
            padding: "4px 10px",
            borderBottom: "1px solid var(--border1)",
            background: "var(--bg1)",
          }}>
            {["NAME", "TYPE", "NULL"].map(h => (
              <span key={h} style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                fontWeight: 500,
                color: "var(--text3)",
                letterSpacing: "0.06em",
              }}>{h}</span>
            ))}
          </div>

          {/* rows */}
          {table.columns.map((col, i) => (
            <div
              key={col.name}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 40px",
                padding: "3px 10px",
                alignItems: "center",
                background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                borderBottom: "1px solid var(--border1)",
              }}
            >
              {/* name */}
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                {col.pk
                  ? <KeyRound size={9} style={{ color: "#eab308", flexShrink: 0 }} />
                  : col.fk
                    ? <Link2 size={9} style={{ color: "var(--accent)", flexShrink: 0 }} />
                    : <Columns3 size={9} style={{ color: "var(--text3)", flexShrink: 0 }} />
                }
                <span style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  color: col.pk ? "#eab308" : col.fk ? "var(--accent)" : "var(--text1)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {col.name}
                </span>
              </div>

              {/* type */}
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--text3)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {col.type}
              </span>

              {/* nullable */}
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: col.nullable ? "var(--text3)" : "var(--text2)",
              }}>
                {col.nullable ? "Yes" : "No"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Statement tab ── */}
      {tab === "statement" && (
        <div style={{ padding: "10px", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text3)", lineHeight: 1.7 }}>
          <span style={{ color: "#c084fc" }}>CREATE TABLE </span>
          <span style={{ color: "var(--text1)" }}>{table.name} </span>
          <span style={{ color: "var(--text2)" }}>(…);</span>
        </div>
      )}

      {/* ── Dependencies tab ── */}
      {tab === "deps" && (
        <div style={{ padding: "10px", fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text3)" }}>
          No external dependencies.
        </div>
      )}
    </div>
  )
}
