"use client"

import { useState, useRef, useCallback } from "react"

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type Tab = "overview" | "data" | "modules" | "score"

interface RepoMeta {
  owner: string
  repo: string
  description: string
  language: string
  stars: number
  fileCount: number
}

interface OverviewSection {
  title: string
  content: string
}

interface DataItem {
  type: "collect" | "store" | "send"
  label: string
  description: string
  sourceLine?: string
}

interface Module {
  name: string
  path: string
  description: string
  sourceSnippet?: string
}

interface ScoreDimension {
  label: string
  verdictLabel: string
  pass: boolean
}

interface Analysis {
  meta: RepoMeta
  overview: OverviewSection[]
  dataItems: DataItem[]
  dataFlowSummary: string
  modules: Module[]
  score: ScoreDimension[]
  overallVerdict: string
}

// ─────────────────────────────────────────────
// BINARY ANIMATION HOOK
// ─────────────────────────────────────────────

function useBinaryAnimation() {
  const animate = useCallback((
    target: string,
    onUpdate: (val: string) => void,
    onDone: () => void
  ) => {
    const chars = "01"
    const duration = 800
    const steps = 12
    const interval = duration / steps
    let step = 0

    const tick = setInterval(() => {
      step++
      if (step >= steps) {
        clearInterval(tick)
        onUpdate(target)
        onDone()
        return
      }
      const progress = step / steps
      const resolved = Math.floor(progress * target.length)
      const animated = target
        .split("")
        .map((char, i) => {
          if (i < resolved) return char
          if (char === " ") return " "
          return chars[Math.floor(Math.random() * chars.length)]
        })
        .join("")
      onUpdate(animated)
    }, interval)
  }, [])

  return animate
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────

export default function IGititPage() {
  const [url, setUrl] = useState("")
  const [isAnimating, setIsAnimating] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeStep, setAnalyzeStep] = useState(0)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const [expandedModule, setExpandedModule] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const animateBinary = useBinaryAnimation()

  const handleUrlChange = (val: string) => {
    setUrl(val)
    if (!val) return
    setIsAnimating(true)
    animateBinary(val, () => {}, () => setIsAnimating(false))
  }

  const handleAnalyze = async () => {
    if (!url.trim() || isAnalyzing) return
    setIsAnalyzing(true)
    setAnalysis(null)
    setError(null)
    setActiveTab("overview")
    setAnalyzeStep(0)

    try {
      // Step 1 — fetch repo
      setAnalyzeStep(1)
      const repoRes = await fetch("/api/repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      })
      if (!repoRes.ok) {
        const err = await repoRes.json()
        throw new Error(err.error ?? "Failed to fetch repository")
      }
      const repoData = await repoRes.json()

      // Step 2 — analyze
      setAnalyzeStep(2)
      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(repoData),
      })
      if (!analyzeRes.ok) {
        const err = await analyzeRes.json()
        throw new Error(err.error ?? "Failed to analyze repository")
      }
      const { analysis: analysisData, meta } = await analyzeRes.json()

      setAnalysis({ ...analysisData, meta })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsAnalyzing(false)
      setAnalyzeStep(0)
    }
  }

  const dataColor = (type: "collect" | "store" | "send") => {
    if (type === "collect") return "#C4974A"
    if (type === "store") return "#4CAF7D"
    return "#E05C5C"
  }

  const scoreColor = (pass: boolean) => pass ? "#4CAF7D" : "#E05C5C"

  const STEPS = [
    "fetching repository tree…",
    "reading file structure…",
    "analyzing with Claude…",
    "generating plain-language output…",
  ]

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#0b0b0c",
      fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
      fontSize: '14px',
      color: "rgba(255,255,255,0.92)",
      padding: "48px 40px 120px",
      maxWidth: "1100px",
      margin: "0 auto",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; }
        ::selection { background: rgba(196,151,74,0.3); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .tab-btn:hover { background: rgba(255,255,255,0.05) !important; }
        .module-card:hover { border-color: rgba(255,255,255,0.15) !important; }
        .analyze-btn:hover:not(:disabled) { background: rgba(196,151,74,0.9) !important; }
      `}</style>

      {/* HEADER */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "40px",
        paddingBottom: "20px",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "16px" }}>
          <div style={{ fontSize: "36px", letterSpacing: "-0.5px" }}>
            <span style={{ fontWeight: 500 }}>iGIT</span>
            <span style={{ fontWeight: 300, opacity: 0.7 }}>it</span>
          </div>
          <div style={{ fontSize: "18px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em" }}>
            open source, open language.
          </div>
        </div>
        <div style={{
          fontSize: "14px",
          color: "rgba(255,255,255,0.4)",
          letterSpacing: "0.1em",
          border: "1px solid rgba(255,255,255,0.1)",
          padding: "6px 20px",
          borderRadius: "4px",
        }}>
          OMARO PBC
        </div>
      </div>

      {/* INPUT */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{
          fontSize: "18px",
          color: "rgba(255,255,255,0.35)",
          letterSpacing: "0.06em",
          marginBottom: "12px",
        }}>
          paste a github or gitlab repository url
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <div style={{
            flex: 1,
            background: "rgba(255,255,255,0.03)",
            border: `1px solid ${isAnimating ? "rgba(196,151,74,0.4)" : "rgba(255,255,255,0.1)"}`,
            borderRadius: "6px",
            padding: "16px 24px",
            position: "relative",
            overflow: "hidden",
            transition: "border-color 0.2s",
          }}>
            <input
              ref={inputRef}
              type="text"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              placeholder="https://github.com/owner/repository"
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                fontFamily: "inherit",
                fontSize: "18px",
                color: isAnimating ? "#C4974A" : "rgba(255,255,255,0.88)",
                letterSpacing: isAnimating ? "0.02em" : "normal",
                transition: "color 0.2s",
              }}
            />
            {isAnimating && (
              <div style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "1px",
                background: "linear-gradient(90deg, transparent, #C4974A, transparent)",
                animation: "pulse 0.4s ease-in-out infinite",
              }} />
            )}
          </div>
          <button
            className="analyze-btn"
            onClick={handleAnalyze}
            disabled={!url.trim() || isAnalyzing}
            style={{
              padding: "16px 32px",
              background: url.trim() && !isAnalyzing ? "#C4974A" : "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "6px",
              fontFamily: "inherit",
              fontSize: "18px",
              color: url.trim() && !isAnalyzing ? "#0b0b0c" : "rgba(255,255,255,0.3)",
              cursor: url.trim() && !isAnalyzing ? "pointer" : "default",
              letterSpacing: "0.08em",
              fontWeight: 400,
              whiteSpace: "nowrap",
              transition: "all 0.15s",
            }}
          >
            {isAnalyzing ? "[ analyzing… ]" : "[ analyze ]"}
          </button>
        </div>
      </div>

      {/* ERROR */}
      {error && !isAnalyzing && (
        <div style={{
          padding: "16px 20px",
          background: "rgba(224,92,92,0.08)",
          border: "1px solid rgba(224,92,92,0.3)",
          borderRadius: "8px",
          fontSize: "14px",
          color: "#E05C5C",
          marginBottom: "24px",
          animation: "fadeIn 0.3s ease",
        }}>
          <span style={{ marginRight: "8px" }}>⚠</span>{error}
        </div>
      )}

      {/* ANALYZING STATE */}
      {isAnalyzing && (
        <div style={{
          padding: "32px",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "8px",
          animation: "fadeIn 0.3s ease",
        }}>
          {STEPS.map((msg, i) => (
            <div key={i} style={{
              fontSize: "14px",
              color: i < analyzeStep ? "rgba(255,255,255,0.25)" :
                     i === analyzeStep ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)",
              letterSpacing: "0.04em",
              marginBottom: "10px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              animation: `fadeIn 0.4s ease ${i * 0.2}s both`,
            }}>
              <span style={{
                color: i < analyzeStep ? "#4CAF7D" :
                       i === analyzeStep ? "#C4974A" : "rgba(255,255,255,0.15)",
                fontSize: "12px",
              }}>
                {i < analyzeStep ? "✓" : i === analyzeStep ? "→" : "·"}
              </span>
              {msg}
              {i === analyzeStep && (
                <span style={{ animation: "blink 0.8s step-end infinite" }}>_</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* RESULTS */}
      {analysis && !isAnalyzing && (
        <div style={{ animation: "fadeIn 0.4s ease" }}>

          {/* REPO META */}
          <div style={{ marginBottom: "24px" }}>
            <div style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: "6px",
              flexWrap: "wrap",
              gap: "8px",
            }}>
              <div style={{ fontSize: "18px", fontWeight: 500, letterSpacing: "0.02em" }}>
                {analysis.meta.owner}/{analysis.meta.repo}
              </div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {analysis.meta.language && (
                  <span style={{ fontSize: "12px", padding: "3px 10px", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "4px", color: "rgba(255,255,255,0.6)" }}>
                    {analysis.meta.language}
                  </span>
                )}
                <span style={{ fontSize: "12px", padding: "3px 10px", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "4px", color: "rgba(255,255,255,0.6)" }}>
                  ★ {analysis.meta.stars}
                </span>
                <span style={{ fontSize: "12px", padding: "3px 10px", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "4px", color: "rgba(255,255,255,0.6)" }}>
                  {analysis.meta.fileCount} files
                </span>
              </div>
            </div>
            {analysis.meta.description && (
              <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
                {analysis.meta.description}
              </div>
            )}
          </div>

          {/* TABS */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "8px",
            marginBottom: "20px",
          }}>
            {([
              { id: "overview", label: "[ overview ]" },
              { id: "data", label: "[ data narrative ]" },
              { id: "modules", label: "[ module breakdown ]" },
              { id: "score", label: "[ score ]" },
            ] as { id: Tab; label: string }[]).map((tab) => (
              <button
                key={tab.id}
                className="tab-btn"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "16px 8px",
                  background: activeTab === tab.id ? "rgba(196,151,74,0.1)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${activeTab === tab.id ? "#C4974A" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: "8px",
                  fontFamily: "inherit",
                  fontSize: "16px",
                  color: activeTab === tab.id ? "#C4974A" : "rgba(255,255,255,0.45)",
                  cursor: "pointer",
                  letterSpacing: "0.04em",
                  lineHeight: 1.4,
                  transition: "all 0.15s",
                  textAlign: "center",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB CONTENT */}
          <div key={activeTab} style={{ animation: "fadeIn 0.25s ease" }}>

            {/* OVERVIEW */}
            {activeTab === "overview" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {analysis.overview.map((section, i) => (
                  <div key={i} style={{
                    padding: "36px 40px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: "8px",
                  }}>
                    <div style={{
                      fontSize: "12px",
                      letterSpacing: "0.12em",
                      color: "rgba(255,255,255,0.3)",
                      marginBottom: "16px",
                    }}>
                      {section.title}
                    </div>
                    <div style={{
                      fontSize: "18px",
                      lineHeight: 1.75,
                      color: "rgba(255,255,255,0.82)",
                      fontWeight: 300,
                    }}>
                      {section.content}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* DATA NARRATIVE */}
            {activeTab === "data" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{
                  padding: "36px 40px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "8px",
                }}>
                  <div style={{
                    fontSize: "12px",
                    letterSpacing: "0.12em",
                    color: "rgba(255,255,255,0.3)",
                    marginBottom: "20px",
                  }}>
                    DATA THIS SOFTWARE TOUCHES
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {analysis.dataItems.map((item, i) => (
                      <div key={i} style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                        <div style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: dataColor(item.type),
                          flexShrink: 0,
                          marginTop: "7px",
                        }} />
                        <div>
                          <span style={{ fontSize: "18px", color: "rgba(255,255,255,0.82)", fontWeight: 400 }}>
                            {item.label}
                          </span>
                          <span style={{ fontSize: "18px", color: "rgba(255,255,255,0.4)", fontWeight: 300 }}>
                            {" "}— {item.description}
                          </span>
                          {item.sourceLine && (
                            <div style={{
                              marginTop: "4px",
                              fontSize: "12px",
                              color: "#C4974A",
                              opacity: 0.7,
                              fontFamily: "inherit",
                            }}>
                              → {item.sourceLine}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{
                    display: "flex",
                    gap: "16px",
                    marginTop: "24px",
                    paddingTop: "20px",
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                  }}>
                    {[
                      { color: "#C4974A", label: "collected" },
                      { color: "#4CAF7D", label: "stored" },
                      { color: "#E05C5C", label: "transmitted" },
                    ].map(({ color, label }) => (
                      <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: color }} />
                        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", letterSpacing: "0.04em" }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{
                  padding: "36px 40px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "8px",
                }}>
                  <div style={{
                    fontSize: "12px",
                    letterSpacing: "0.12em",
                    color: "rgba(255,255,255,0.3)",
                    marginBottom: "16px",
                  }}>
                    DATA FLOW SUMMARY
                  </div>
                  <div style={{ fontSize: "18px", lineHeight: 1.75, color: "rgba(255,255,255,0.7)", fontWeight: 300 }}>
                    {analysis.dataFlowSummary}
                  </div>
                </div>
              </div>
            )}

            {/* MODULE BREAKDOWN */}
            {activeTab === "modules" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {analysis.modules.map((mod, i) => (
                  <div
                    key={i}
                    className="module-card"
                    style={{
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "8px",
                      overflow: "hidden",
                      transition: "border-color 0.15s",
                    }}
                  >
                    <div
                      style={{ padding: "24px 32px", cursor: "pointer" }}
                      onClick={() => setExpandedModule(expandedModule === mod.name ? null : mod.name)}
                    >
                      <div style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        marginBottom: "10px",
                      }}>
                        <div style={{ fontSize: "16px", fontWeight: 500, color: "rgba(255,255,255,0.88)" }}>
                          {mod.name}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          {mod.path && (
                            <span style={{
                              fontSize: "11px",
                              padding: "3px 8px",
                              background: "rgba(255,255,255,0.05)",
                              borderRadius: "4px",
                              color: "rgba(255,255,255,0.35)",
                              letterSpacing: "0.06em",
                            }}>
                              {mod.path}
                            </span>
                          )}
                          {mod.sourceSnippet && (
                            <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.25)" }}>
                              {expandedModule === mod.name ? "▲" : "▼"}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: "18px", lineHeight: 1.75, color: "rgba(255,255,255,0.55)", fontWeight: 300 }}>
                        {mod.description}
                      </div>
                    </div>

                    {expandedModule === mod.name && mod.sourceSnippet && (
                      <div style={{
                        borderTop: "1px solid rgba(255,255,255,0.06)",
                        background: "rgba(0,0,0,0.3)",
                        animation: "fadeIn 0.2s ease",
                      }}>
                        <div style={{
                          padding: "10px 32px",
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                          fontSize: "11px",
                          color: "rgba(255,255,255,0.25)",
                          letterSpacing: "0.1em",
                          display: "flex",
                          justifyContent: "space-between",
                        }}>
                          <span>[ source ]</span>
                          <span>{mod.path}</span>
                        </div>
                        <pre style={{
                          padding: "20px 32px",
                          margin: 0,
                          fontSize: "13px",
                          lineHeight: 1.7,
                          color: "rgba(255,255,255,0.55)",
                          overflowX: "auto",
                          fontFamily: "inherit",
                          whiteSpace: "pre-wrap",
                        }}>
                          {mod.sourceSnippet.split("\n").map((line, li) => (
                            <span key={li} style={{
                              display: "block",
                              color: line.trim().startsWith("//")
                                ? "rgba(255,255,255,0.25)"
                                : "rgba(255,255,255,0.65)",
                            }}>
                              {line}
                            </span>
                          ))}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* SCORE */}
            {activeTab === "score" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{
                  padding: "36px 40px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "8px",
                }}>
                  <div style={{
                    fontSize: "12px",
                    letterSpacing: "0.12em",
                    color: "rgba(255,255,255,0.3)",
                    marginBottom: "24px",
                  }}>
                    ACCOUNTABILITY SCORE · {analysis.meta.owner}/{analysis.meta.repo}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    {analysis.score.map((dim, i) => (
                      <div key={i}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                          <span style={{ fontSize: "16px", color: "rgba(255,255,255,0.7)", fontWeight: 300 }}>
                            {dim.label}
                          </span>
                          <span style={{ fontSize: "14px", color: scoreColor(dim.pass), letterSpacing: "0.04em" }}>
                            {dim.verdictLabel}
                          </span>
                        </div>
                        <div style={{
                          height: "3px",
                          background: "rgba(255,255,255,0.06)",
                          borderRadius: "2px",
                          overflow: "hidden",
                        }}>
                          <div style={{
                            height: "100%",
                            width: dim.pass ? "85%" : "20%",
                            background: scoreColor(dim.pass),
                            borderRadius: "2px",
                            transition: "width 0.6s ease",
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{
                  padding: "36px 40px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "8px",
                }}>
                  <div style={{
                    fontSize: "12px",
                    letterSpacing: "0.12em",
                    color: "rgba(255,255,255,0.3)",
                    marginBottom: "16px",
                  }}>
                    OVERALL VERDICT
                  </div>
                  <div style={{ fontSize: "18px", lineHeight: 1.75, color: "rgba(255,255,255,0.7)", fontWeight: 300 }}>
                    {analysis.overallVerdict}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* LISTEN BAR */}
          <div style={{
            marginTop: "24px",
            padding: "16px 20px",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}>
            <span style={{
              fontSize: "14px",
              color: "rgba(255,255,255,0.3)",
              letterSpacing: "0.06em",
              whiteSpace: "nowrap",
            }}>
              [ listen to analysis ]
            </span>
            <select style={{
              flex: 1,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "6px",
              padding: "8px 12px",
              fontFamily: "inherit",
              fontSize: "14px",
              color: "rgba(255,255,255,0.6)",
              outline: "none",
              cursor: "pointer",
            }}>
              <option value="overview">overview</option>
              <option value="data">data narrative</option>
              <option value="modules">module breakdown</option>
              <option value="score">accountability score</option>
            </select>
            <button style={{
              width: "52px",
              height: "44px",
              borderRadius: "8px",
              background: "#C4974A",
              border: "none",
              fontFamily: "inherit",
              fontSize: "13px",
              color: "#0b0b0c",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              ▶
            </button>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div style={{
        marginTop: "60px",
        paddingTop: "20px",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        fontSize: "14px",
        color: "rgba(255,255,255,0.2)",
        lineHeight: 1.7,
        letterSpacing: "0.04em",
      }}>
        <div>generated by iGITit · powered by Claude · an OMARO PBC product · igitit.xyz (coming soon)</div>
        <div>analysis reflects repository state at time of request · not legal or compliance advice</div>
      </div>
    </div>
  )
}
