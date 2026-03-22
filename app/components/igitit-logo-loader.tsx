"use client"

import { useEffect, useState } from "react"

// ─────────────────────────────────────────────
// LOGO
// ─────────────────────────────────────────────

export function IGititLogo({ onClick }: { onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{ cursor: onClick ? "pointer" : "default", userSelect: "none", display: "inline-block" }}>
      <svg width="630" height="160" viewBox="0 0 400 100" xmlns="http://www.w3.org/2000/svg">
        <text x="0" y="72" dominantBaseline="auto" style={{ fontFamily: "'IBM Plex Mono','Courier New',monospace", fontSize: "56px", letterSpacing: "-2px" }}>
          <tspan style={{ fontWeight: 500, fill: "rgba(255,255,255,0.92)" }}>ıGIT</tspan>
          <tspan style={{ fontWeight: 300, fill: "rgba(255,255,255,0.45)" }}>ıt</tspan>
        </text>
        {/* Blue dot over first ı */}
        <circle cx="13" cy="25" r="5" fill="#4A9EF0" />
        {/* Blue dot over second ı */}
        <circle cx="147" cy="25" r="5" fill="#4A9EF0" />
      </svg>
    </div>
  )
}

// ─────────────────────────────────────────────
// COMMIT GRAPH LOADER
// ─────────────────────────────────────────────

const NODES = [
  { id: 0, x: 80,  y: 60,  label: "HEAD",       branch: "main" },
  { id: 1, x: 80,  y: 120, label: "init",        branch: "main" },
  { id: 2, x: 80,  y: 180, label: "fetch tree",  branch: "main" },
  { id: 5, x: 200, y: 150, label: "parse meta",  branch: "feature" },
  { id: 6, x: 200, y: 210, label: "score",       branch: "feature" },
]

const EDGES = [
  { from: 0, to: 1, branch: "main" },
  { from: 1, to: 2, branch: "main" },
  { from: 1, to: 5, branch: "feature" },
  { from: 5, to: 6, branch: "feature" },
]

const STEP_REVEALS: { nodes: number[]; edges: number[] }[] = [
  { nodes: [0, 1],    edges: [0] },
  { nodes: [2, 5],    edges: [1, 2] },
  { nodes: [6],       edges: [3] },
  { nodes: [],        edges: [] },
]

const STEP_LABELS = [
  "fetching repository tree…",
  "reading file structure…",
  "analyzing with Claude…",
  "generating plain-language output…",
]

const SHAS = ["a3f8c1", "7b2e90", "d4a12f", "9c3e7b", "f1d8a2", "3b9c4e", "c7f2a1", "8d3b9f"]

function nodeColor(branch: string, active: boolean) {
  if (branch === "main")    return active ? "#4A9EF0" : "rgba(74,158,240,0.4)"
  if (branch === "feature") return active ? "#4CAF7D" : "rgba(76,175,125,0.4)"
  return "rgba(255,255,255,0.2)"
}

function edgeColor(branch: string) {
  if (branch === "main")    return "rgba(74,158,240,0.35)"
  if (branch === "feature") return "rgba(76,175,125,0.35)"
  return "rgba(255,255,255,0.15)"
}

export function CommitGraphLoader({ step }: { step: number }) {
  const [visibleNodes, setVisibleNodes] = useState<Set<number>>(new Set([0]))
  const [visibleEdges, setVisibleEdges] = useState<Set<number>>(new Set())
  const [activeNode, setActiveNode]     = useState<number>(0)
  const [tick, setTick]                 = useState(0)

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 500)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const toReveal = STEP_REVEALS.slice(0, step + 1)
    const newNodes = new Set<number>([0])
    const newEdges = new Set<number>()
    toReveal.forEach(r => {
      r.nodes.forEach(n => newNodes.add(n))
      r.edges.forEach(e => newEdges.add(e))
    })
    Array.from(newNodes).forEach((n, i) => {
      setTimeout(() => {
        setVisibleNodes(prev => new Set([...prev, n]))
        setActiveNode(n)
      }, i * 120)
    })
    Array.from(newEdges).forEach((e, i) => {
      setTimeout(() => {
        setVisibleEdges(prev => new Set([...prev, e]))
      }, i * 100 + 60)
    })
  }, [step])

  return (
    <div style={{ padding: "32px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px", display: "grid", gridTemplateColumns: "280px 1fr", gap: "32px", alignItems: "start", animation: "fadeIn 0.3s ease" }}>
      <div>
        <div style={{ fontSize: "10px", letterSpacing: "0.1em", color: "rgba(255,255,255,0.2)", marginBottom: "12px", fontFamily: "'IBM Plex Mono', monospace" }}>COMMIT GRAPH</div>
        <svg width={280} height={200} viewBox="0 0 280 200" style={{ fontFamily: "'IBM Plex Mono', monospace", overflow: "visible" }}>
          <line x1="80" y1="40" x2="80" y2="220" stroke="rgba(74,158,240,0.07)" strokeWidth="1.5" strokeDasharray="2 4" />
          <line x1="200" y1="130" x2="200" y2="220" stroke="rgba(76,175,125,0.07)" strokeWidth="1.5" strokeDasharray="2 4" />
          <text x="88" y="30" style={{ fontSize: "10px", fill: "rgba(74,158,240,0.4)", letterSpacing: "0.08em" }}>main</text>
          <text x="208" y="130" style={{ fontSize: "10px", fill: "rgba(76,175,125,0.4)", letterSpacing: "0.08em" }}>analysis</text>
          {EDGES.map((edge, i) => {
            if (!visibleEdges.has(i)) return null
            const from = NODES.find(n => n.id === edge.from)
            const to = NODES.find(n => n.id === edge.to)
            if (!from || !to) return null
            const color = edgeColor(edge.branch)
            if (edge.branch === "feature" && edge.from === 1)
              return <path key={i} d={`M ${from.x} ${from.y} C ${from.x} ${(from.y+to.y)/2}, ${to.x} ${(from.y+to.y)/2}, ${to.x} ${to.y}`} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
            if (edge.branch === "merge")
              return <path key={i} d={`M ${from.x} ${from.y} C ${from.x} ${(from.y+to.y)/2}, ${to.x} ${(from.y+to.y)/2}, ${to.x} ${to.y}`} fill="none" stroke="rgba(74,158,240,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 2" />
            return <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={color} strokeWidth="1.5" strokeLinecap="round" />
          })}
          {NODES.map(node => {
            if (!visibleNodes.has(node.id)) return null
            const isActive = activeNode === node.id
            const color = nodeColor(node.branch, isActive)
            return (
              <g key={node.id}>
                {isActive && <circle cx={node.x} cy={node.y} r="12" fill="none" stroke={node.branch === "feature" ? "rgba(76,175,125,0.2)" : "rgba(74,158,240,0.2)"} strokeWidth="1" />}
                <circle cx={node.x} cy={node.y} r={isActive ? 8 : 6} fill={color} stroke={isActive ? (node.branch === "feature" ? "#4CAF7D" : "#4A9EF0") : "rgba(255,255,255,0.1)"} strokeWidth={isActive ? 1.5 : 0.5} />
                <text x={node.x + 18} y={node.y} dominantBaseline="central" style={{ fontSize: "11px", fill: isActive ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.3)", letterSpacing: "0.04em" }}>{node.label}</text>
                {isActive && <text x={node.x + 18} y={node.y + 14} dominantBaseline="central" style={{ fontSize: "9px", fill: node.branch === "feature" ? "rgba(76,175,125,0.5)" : "rgba(74,158,240,0.5)", letterSpacing: "0.06em" }}>{SHAS[node.id]}</text>}
              </g>
            )
          })}
        </svg>
      </div>
      <div style={{ paddingTop: "32px" }}>
        {STEP_LABELS.map((msg, i) => {
          const done = i < step; const active = i === step
          return (
            <div key={i} style={{ fontSize: "14px", color: done ? "rgba(255,255,255,0.2)" : active ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.15)", letterSpacing: "0.04em", marginBottom: "20px", display: "flex", alignItems: "flex-start", gap: "12px", fontFamily: "'IBM Plex Mono', monospace" }}>
              <span style={{ fontSize: "13px", color: done ? "#4CAF7D" : active ? "#4A9EF0" : "rgba(255,255,255,0.12)", flexShrink: 0, marginTop: "1px" }}>
                {done ? "✓" : active ? "→" : "·"}
              </span>
              <span>
                {msg}
                {active && <span style={{ opacity: tick % 2 === 0 ? 1 : 0, color: "#4A9EF0", transition: "opacity 0.1s" }}>_</span>}
              </span>
            </div>
          )
        })}
        <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: "16px" }}>
          {[{ color: "#4A9EF0", label: "main" }, { color: "#4CAF7D", label: "analysis" }].map(({ color, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: color, opacity: 0.6 }} />
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.06em", fontFamily: "'IBM Plex Mono', monospace" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
