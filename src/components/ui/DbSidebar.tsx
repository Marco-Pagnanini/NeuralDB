import { useState } from "react"
import {
  ChevronDown, ChevronRight,
  Table2, Columns3, ListFilter,
  KeyRound, Link2, Search, GitCompare,
} from "lucide-react"
import { cn } from "../../lib/utils"
import type { TableDef } from "../pages/Dashboard"
import logo from "../../assets/logo.png"

/* ─── Types ──────────────────────────────────────────── */
interface TreeItemProps {
  label: string
  icon?: React.ReactNode
  accent?: string
  depth?: number
  defaultOpen?: boolean
  onRowClick?: () => void
  children?: React.ReactNode
}

/* ─── Tree node ──────────────────────────────────────── */
function TreeItem({ label, icon, accent, depth = 0, defaultOpen = false, onRowClick, children }: TreeItemProps) {
  const [open, setOpen] = useState(defaultOpen)
  const hasChildren = Boolean(children)

  return (
    <div>
      <button
        onClick={() => { if (hasChildren) setOpen(o => !o); onRowClick?.() }}
        className={cn(
          "w-full flex items-center gap-1.5 px-2 py-[3px] rounded-[5px] text-left transition-colors duration-100",
          "hover:bg-(--bg3)",
          !hasChildren && "cursor-default"
        )}
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        {/* chevron */}
        {hasChildren ? (
          <span style={{ color: "var(--text3)", flexShrink: 0, width: 12 }}>
            {open
              ? <ChevronDown size={11} />
              : <ChevronRight size={11} />}
          </span>
        ) : (
          <span style={{ width: 12, flexShrink: 0 }} />
        )}

        {/* icon */}
        {icon && (
          <span style={{ color: accent ?? "var(--text3)", flexShrink: 0 }}>
            {icon}
          </span>
        )}

        {/* label */}
        <span style={{
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          color: "var(--text2)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {label}
        </span>
      </button>

      {open && children && (
        <div>{children}</div>
      )}
    </div>
  )
}

/* ─── Column icon ────────────────────────────────────── */
function ColIcon({ pk, fk }: { pk?: boolean; fk?: boolean }) {
  if (pk) return <KeyRound size={10} style={{ color: "#eab308" }} />
  if (fk) return <Link2 size={10} style={{ color: "var(--accent)" }} />
  return <Columns3 size={10} style={{ color: "var(--text3)" }} />
}

/* ─── Sidebar ────────────────────────────────────────── */
interface DbSidebarProps {
  tables: TableDef[]
  activeTable: string | null
  onSelectTable: (id: string) => void
}

export function DbSidebar({ tables, activeTable, onSelectTable }: DbSidebarProps) {
  return (
    <aside style={{
      width: 240,
      minWidth: 240,
      height: "100%",
      background: "var(--bg1)",
      borderRight: "1px solid var(--border1)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>

      {/* ── Logo ── */}
      <div style={{
        height: 44,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 14px",
        borderBottom: "1px solid var(--border1)",
        flexShrink: 0,
      }}>
        <img src={logo} alt="NeuralDB" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover", objectPosition: "center 10%" }} />
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, color: "var(--text1)", letterSpacing: "-0.02em" }}>
          Neural<span style={{ color: "var(--accent)" }}>DB</span>
        </span>
        <span style={{
          marginLeft: "auto",
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          fontWeight: 500,
          color: "var(--accent)",
          background: "var(--accent-dim)",
          border: "1px solid rgba(93,184,245,0.2)",
          borderRadius: 4,
          padding: "1px 5px",
          letterSpacing: "0.04em",
        }}>DEMO</span>
      </div>

      {/* ── Search ── */}
      <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border1)", flexShrink: 0 }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "var(--bg2)",
          border: "1px solid var(--border2)",
          borderRadius: 6,
          padding: "5px 8px",
        }}>
          <Search size={12} style={{ color: "var(--text3)", flexShrink: 0 }} />
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text3)", flex: 1 }}>Search…</span>
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            color: "var(--text3)",
            background: "var(--bg3)",
            border: "1px solid var(--border2)",
            borderRadius: 3,
            padding: "1px 4px",
          }}>⌘K</span>
        </div>
      </div>

      {/* ── Tree ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 6px" }}>
        <TreeItem
          label="Tables"
          icon={<Table2 size={12} />}
          depth={0}
          defaultOpen
        >
          {tables.map(table => (
            <TreeItem
              key={table.id}
              label={table.name}
              icon={<Table2 size={11} />}
              accent={table.color}
              depth={1}
              defaultOpen={activeTable === table.id}
              onRowClick={() => onSelectTable(table.id)}
            >
              {/* Columns group */}
              <TreeItem label="Columns" icon={<Columns3 size={10} />} depth={2} defaultOpen>
                {table.columns.map(col => (
                  <TreeItem
                    key={col.name}
                    label={col.name}
                    icon={<ColIcon pk={col.pk} fk={col.fk} />}
                    depth={3}
                  />
                ))}
              </TreeItem>
              {/* Indexes group */}
              <TreeItem label="Indexes" icon={<ListFilter size={10} />} depth={2}>
                {table.columns.filter(c => c.pk || c.fk).map(col => (
                  <TreeItem
                    key={col.name}
                    label={col.name}
                    icon={<KeyRound size={10} />}
                    depth={3}
                  />
                ))}
              </TreeItem>
            </TreeItem>
          ))}
        </TreeItem>
      </div>

      {/* ── Footer ── */}
      <div style={{
        borderTop: "1px solid var(--border1)",
        padding: "8px 10px",
        flexShrink: 0,
      }}>
        <button
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[5px] hover:bg-(--bg3) transition-colors duration-100"
          style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text3)" }}
        >
          <GitCompare size={12} style={{ color: "var(--text3)" }} />
          Compare Schema Versions
        </button>
      </div>
    </aside>
  )
}
