"use client"

import { useState, useRef, useEffect, useCallback } from "react"

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
  verdict: "transparent" | "disclosed" | "fully auditabl" | "not defined" | "flagged" | "pass"
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
// TYPEWRITER HOOK
// ─────────────────────────────────────────────

function useTypewriter(text: string, speed = 12, active = false) {
  const [displayed, setDisplayed] = useState("")
  const [done, setDone] = useState(false)
  const indexRef = useRef(0)

  useEffect(() => {
    if (!active || !text) return
    indexRef.current = 0
    setDisplayed("")
    setDone(false)
    const interval = setInterval(() => {
      if (indexRef.current >= text.length) {
        setDone(true)
        clearInterval(interval)
        return
      }
      setDisplayed(text.slice(0, indexRef.current + 1))
      indexRef.current++
    }, speed)
    return () => clearInterval(interval)
  }, [text, speed, active])

  return { displayed, done }
}

// ─────────────────────────────────────────────
// MOCK ANALYSIS (real Claude API call in prod)
// ─────────────────────────────────────────────

function getMockAnalysis(url: string): Analysis {
  const isOmen = url.includes("OMEN")
  const isUs = url.includes("US") || url.includes("us-app")

  return {
    meta: {
      owner: isOmen ? "OMARO000" : isUs ? "OMARO000" : "owner",
      repo: isOmen ? "OMEN-PUB" : isUs ? "-US-PUB" : "repository",
      description: isOmen
        ? "permanent open-source corporate accountability ledger · TypeScript · Next.js"
        : isUs
        ? "human connection platform · TypeScript · Next.js"
        : "open-source repository · TypeScript",
      language: "TypeScript",
      stars: isOmen ? 12 : 4,
      fileCount: isOmen ? 84 : 47,
    },
    overview: [
      {
        title: "WHAT THIS SOFTWARE DOES",
        content: isOmen
          ? "OMEN is a permanent, open-source corporate accountability ledger. it documents verified violations across 646 companies using court-grade primary sources — tracking privacy, labor, ethics, environment, and antitrust failures in a single auditable record."
          : "this software builds and operates a human connection platform focused on authentic relationships. it uses a multi-layer matching engine, AI-guided intake conversations, and self-portrait generation to help people understand themselves and connect meaningfully.",
      },
      {
        title: "WHO IT SERVES",
        content: isOmen
          ? "journalists, regulators, researchers, and the public — anyone who needs to verify corporate behavior against a permanent, tamper-resistant record. built for accountability, not litigation."
          : "people seeking genuine platonic, romantic, or professional connections — specifically those who want depth over volume and prefer self-knowledge as a foundation for meeting others.",
      },
      {
        title: "WHY IT WAS BUILT",
        content: isOmen
          ? "corporate violations are routinely buried, settled quietly, or forgotten. OMEN exists to ensure that verified findings persist permanently — pinned to IPFS, open source, and independently verifiable by anyone."
          : "most connection platforms optimize for engagement and volume. this one optimizes for quality and honesty — treating the intake process as genuine self-reflection rather than profile creation.",
      },
    ],
    dataItems: isOmen
      ? [
          { type: "collect", label: "company violation records", description: "sourced from SEC filings, court documents, regulatory rulings, and government databases" },
          { type: "collect", label: "AI research agent inputs", description: "public URLs and documents fed into the research pipeline for analysis" },
          { type: "store", label: "SQLite database", description: "violation blocks, confidence scores, source URLs, and company tickers stored locally" },
          { type: "store", label: "staged blocks", description: "violations pending human review held in a separate queue before publishing" },
          { type: "send", label: "Pinata / IPFS", description: "approved violation blocks pinned permanently to the decentralized web" },
          { type: "send", label: "Anthropic API", description: "violation text sent to Claude for research, scoring, and synthesis" },
        ]
      : [
          { type: "collect", label: "intake conversation", description: "voice and text responses during the 8-block intake flow — used to generate user portrait" },
          { type: "collect", label: "behavioral signals", description: "disclosed interaction patterns within the platform — never passive device tracking" },
          { type: "store", label: "SQLite database", description: "user portraits, match scores, conversation history, and connection outcomes" },
          { type: "store", label: "portrait NFT data", description: "cryptographic portrait artifacts stored on Solana via Metaplex" },
          { type: "send", label: "Anthropic API", description: "conversation text sent to Claude for portrait generation and match analysis" },
          { type: "send", label: "ElevenLabs API", description: "text sent for voice synthesis — no audio stored server-side" },
        ],
    dataFlowSummary: isOmen
      ? "public source documents enter the system via the research agent. they are analyzed by Claude, scored for confidence, and staged for human review. approved violations are written to SQLite and immediately pinned to IPFS via Pinata — creating a permanent, tamper-resistant record. no user data is collected."
      : "user input enters via the intake conversation. it is analyzed by Claude to generate a portrait and match scores. connection data is stored locally in SQLite. no data is sold, shared with third parties, or used for advertising. users may export their declared profile at any time.",
    modules: isOmen
      ? [
          { name: "research agent", path: "scripts/", description: "an AI-powered pipeline that takes a company name, searches approved sources, and generates a structured violation record. it enforces strict evidence standards — only court-grade primary sources qualify. think of it as an automated investigative researcher with rules it cannot break.", sourceSnippet: "// researchCompanies.ts\nconst APPROVED_SOURCES = [\n  'sec.gov',\n  'ftc.gov', \n  'doj.gov',\n  'courtlistener.com',\n  // 27 more approved domains\n]\n\nasync function researchCompany(ticker: string) {\n  const violations = await agent.search({\n    company: ticker,\n    sources: APPROVED_SOURCES,\n    confidenceThreshold: 0.93\n  })\n  return violations\n}" },
          { name: "ledger + IPFS layer", path: "lib/ipfs/", description: "once a violation is approved, it gets written to a local SQLite database and simultaneously pinned to IPFS via Pinata. this means the record exists in two places — a queryable local database and a permanent, decentralized archive that no single party can delete.", sourceSnippet: "// ipfsPin.ts\nexport async function pinViolation(block: ViolationBlock) {\n  const cid = await pinata.pinJSON({\n    ...block,\n    pinnedAt: Date.now(),\n    version: '1.0'\n  })\n  await db.update(violations)\n    .set({ ipfsCid: cid })\n    .where(eq(violations.id, block.id))\n}" },
          { name: "B2B API", path: "app/api/", description: "a six-safeguard API that lets external developers query the ledger programmatically. journalists can pull all violations for a specific company. the safeguards prevent misuse — rate limiting, authentication, and category restrictions are all enforced server-side.", sourceSnippet: "// route.ts (B2B API)\nconst SAFEGUARDS = [\n  validateApiKey,\n  checkRateLimit,\n  validateTicker,\n  checkCategoryAccess,\n  sanitizeOutput,\n  logAccess\n]\n\nexport async function GET(req: Request) {\n  for (const guard of SAFEGUARDS) {\n    const result = await guard(req)\n    if (!result.ok) return result.error\n  }\n}" },
          { name: "anonymous account system", path: "lib/auth/", description: "modeled after Mullvad VPN — users get a randomly generated account number, no email, no name. the system is designed so that even OMARO cannot link an account to a real person. all preferences and contributions are stored under the account number only.", sourceSnippet: "// accounts.ts\nexport function generateAccountNumber(): string {\n  // 16-digit random number\n  // no email, no name, no PII\n  // even OMARO cannot link to identity\n  return Array.from({length: 16}, () =>\n    Math.floor(Math.random() * 10)\n  ).join('')\n}" },
        ]
      : [
          { name: "intake engine", path: "app/conversation/", description: "an 8-block conversation structure guides users through self-reflection. each block targets a different dimension of identity and connection style. the blocks are invisible to the user — they experience one flowing conversation.", sourceSnippet: "// intake blocks (simplified)\nconst BLOCKS = [\n  'arrival',      // why are you here?\n  'presence',     // how do you show up?\n  'tension',      // what creates friction?\n  'connection',   // what does real connection feel like?\n  'pattern',      // what patterns do you notice?\n  'boundary',     // what are your limits?\n  'aspiration',   // what are you reaching for?\n  'portrait'      // synthesis + delivery\n]" },
          { name: "7-layer match engine", path: "lib/matching/", description: "matching is computed across 7 dimensions — values alignment, communication style, conflict response, growth orientation, and more. the weights are published but the exact arbitration logic is proprietary. compatibility scores are never shown to users.", sourceSnippet: "// matchEngine.ts\nconst LAYERS = [\n  { id: 'values', weight: 0.22 },\n  { id: 'communication', weight: 0.18 },\n  { id: 'conflict', weight: 0.15 },\n  { id: 'growth', weight: 0.15 },\n  { id: 'presence', weight: 0.12 },\n  { id: 'boundary', weight: 0.10 },\n  { id: 'aspiration', weight: 0.08 },\n]" },
        ],
    score: [
      { label: "data minimization", verdict: "transparent", verdictLabel: "[ transparent ]", pass: true },
      { label: "third-party disclosure", verdict: "disclosed", verdictLabel: "[ disclosed ]", pass: true },
      { label: "auditability", verdict: "fully auditabl", verdictLabel: "[ fully auditable ]", pass: true },
      { label: "data retention policy", verdict: "not defined", verdictLabel: "[ not defined ]", pass: false },
    ],
    overallVerdict: isOmen
      ? "this codebase scores highly on transparency and auditability. the primary gap is an undefined data retention policy — the system stores violation records permanently by design, but no documentation exists explaining the rationale or any exception process. recommend adding a RETENTION.md to address this."
      : "this codebase demonstrates strong privacy practices with explicit data minimization and no third-party data sales. the matching engine weights are published. gaps exist in formal retention documentation and the behavioral data collection policy could be more precisely scoped.",
  }
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────

export default function IGititPage() {
  const [url, setUrl] = useState("")
  const [displayUrl, setDisplayUrl] = useState("")
  const [isAnimating, setIsAnimating] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const [expandedModule, setExpandedModule] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const animateBinary = useBinaryAnimation()

  const handleUrlChange = (val: string) => {
    setUrl(val)
    if (!val) { setDisplayUrl(""); return }
    setIsAnimating(true)
    animateBinary(
      val,
      setDisplayUrl,
      () => setIsAnimating(false)
    )
  }

  const handleAnalyze = async () => {
    if (!url.trim() || isAnalyzing) return
    setIsAnalyzing(true)
    setAnalysis(null)
    setActiveTab("overview")
    // simulate API delay — replace with real Claude API call
    await new Promise(r => setTimeout(r, 1800))
    setAnalysis(getMockAnalysis(url))
    setIsAnalyzing(false)
  }

  const dataColor = (type: "collect" | "store" | "send") => {
    if (type === "collect") return "#C4974A"
    if (type === "store") return "#4CAF7D"
    return "#E05C5C"
  }

  const scoreColor = (pass: boolean) => pass ? "#4CAF7D" : "#E05C5C"

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#0b0b0c",
      fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
      color: "rgba(255,255,255,0.92)",
      padding: "32px 24px 80px",
      maxWidth: "900px",
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
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
        .tab-btn:hover { background: rgba(255,255,255,0.05) !important; }
        .module-card:hover { border-color: rgba(255,255,255,0.15) !important; }
        .analyze-btn:hover { background: rgba(196,151,74,0.9) !important; }
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
          <div style={{ fontSize: "22px", letterSpacing: "-0.5px" }}>
            <span style={{ fontWeight: 500 }}>iGIT</span>
            <span style={{ fontWeight: 300, opacity: 0.7 }}>it</span>
          </div>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em" }}>
            open source, open language.
          </div>
        </div>
        <div style={{
          fontSize: "10px",
          color: "rgba(255,255,255,0.4)",
          letterSpacing: "0.1em",
          border: "1px solid rgba(255,255,255,0.1)",
          padding: "5px 10px",
          borderRadius: "4px",
        }}>
          OMARO PBC
        </div>
      </div>

      {/* INPUT */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{
          fontSize: "11px",
          color: "rgba(255,255,255,0.35)",
          letterSpacing: "0.06em",
          marginBottom: "10px",
        }}>
          paste a github or gitlab repository url
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <div style={{
            flex: 1,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "6px",
            padding: "14px 16px",
            position: "relative",
            overflow: "hidden",
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
                fontSize: "14px",
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
              padding: "14px 24px",
              background: url.trim() && !isAnalyzing ? "#C4974A" : "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "6px",
              fontFamily: "inherit",
              fontSize: "13px",
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

      {/* ANALYZING STATE */}
      {isAnalyzing && (
        <div style={{
          padding: "32px",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "8px",
          animation: "fadeIn 0.3s ease",
        }}>
          {["fetching repository tree…", "reading file structure…", "analyzing data flows…", "generating plain-language output…"].map((msg, i) => (
            <div key={i} style={{
              fontSize: "12px",
              color: "rgba(255,255,255,0.4)",
              letterSpacing: "0.04em",
              marginBottom: "8px",
              animation: `fadeIn 0.4s ease ${i * 0.3}s both`,
            }}>
              <span style={{ color: "#C4974A", marginRight: "8px" }}>→</span>
              {msg}
              {i === 3 && <span style={{ animation: "blink 0.8s step-end infinite" }}>_</span>}
            </div>
          ))}
        </div>
      )}

      {/* RESULTS */}
      {analysis && !isAnalyzing && (
        <div style={{ animation: "fadeIn 0.4s ease" }}>

          {/* REPO META */}
          <div style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "6px" }}>
              <div style={{ fontSize: "15px", fontWeight: 500, letterSpacing: "0.02em" }}>
                {analysis.meta.owner}/{analysis.meta.repo}
              </div>
              <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                <span style={{ fontSize: "10px", padding: "3px 8px", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "4px", color: "rgba(255,255,255,0.6)" }}>
                  {analysis.meta.language}
                </span>
                <span style={{ fontSize: "10px", padding: "3px 8px", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "4px", color: "rgba(255,255,255,0.6)" }}>
                  ★ {analysis.meta.stars}
                </span>
                <span style={{ fontSize: "10px", padding: "3px 8px", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "4px", color: "rgba(255,255,255,0.6)" }}>
                  {analysis.meta.fileCount} files
                </span>
              </div>
            </div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
              {analysis.meta.description}
            </div>
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
                  padding: "14px 8px",
                  background: activeTab === tab.id ? "rgba(196,151,74,0.1)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${activeTab === tab.id ? "#C4974A" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: "8px",
                  fontFamily: "inherit",
                  fontSize: "11px",
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
          <div style={{ animation: "fadeIn 0.25s ease" }} key={activeTab}>

            {/* OVERVIEW */}
            {activeTab === "overview" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {analysis.overview.map((section, i) => (
                  <div key={i} style={{
                    padding: "20px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: "8px",
                  }}>
                    <div style={{
                      fontSize: "9px",
                      letterSpacing: "0.12em",
                      color: "rgba(255,255,255,0.3)",
                      marginBottom: "12px",
                    }}>
                      {section.title}
                    </div>
                    <div style={{
                      fontSize: "13px",
                      lineHeight: 1.8,
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
                  padding: "20px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "8px",
                }}>
                  <div style={{
                    fontSize: "9px",
                    letterSpacing: "0.12em",
                    color: "rgba(255,255,255,0.3)",
                    marginBottom: "16px",
                  }}>
                    DATA THIS SOFTWARE TOUCHES
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {analysis.dataItems.map((item, i) => (
                      <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                        <div style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: dataColor(item.type),
                          flexShrink: 0,
                          marginTop: "5px",
                        }} />
                        <div>
                          <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.82)", fontWeight: 400 }}>
                            {item.label}
                          </span>
                          <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", fontWeight: 300 }}>
                            {" "}— {item.description}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{
                    display: "flex",
                    gap: "16px",
                    marginTop: "20px",
                    paddingTop: "16px",
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                  }}>
                    {[
                      { color: "#C4974A", label: "collected" },
                      { color: "#4CAF7D", label: "stored" },
                      { color: "#E05C5C", label: "transmitted" },
                    ].map(({ color, label }) => (
                      <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: color }} />
                        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", letterSpacing: "0.04em" }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{
                  padding: "20px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "8px",
                }}>
                  <div style={{
                    fontSize: "9px",
                    letterSpacing: "0.12em",
                    color: "rgba(255,255,255,0.3)",
                    marginBottom: "12px",
                  }}>
                    DATA FLOW SUMMARY
                  </div>
                  <div style={{ fontSize: "13px", lineHeight: 1.8, color: "rgba(255,255,255,0.7)", fontWeight: 300 }}>
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
                      style={{ padding: "18px 20px", cursor: "pointer" }}
                      onClick={() => setExpandedModule(expandedModule === mod.name ? null : mod.name)}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "8px" }}>
                        <div style={{ fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.88)" }}>
                          {mod.name}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{
                            fontSize: "9px",
                            padding: "3px 8px",
                            background: "rgba(255,255,255,0.05)",
                            borderRadius: "4px",
                            color: "rgba(255,255,255,0.35)",
                            letterSpacing: "0.06em",
                          }}>
                            {mod.path}
                          </span>
                          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>
                            {expandedModule === mod.name ? "▲" : "▼"}
                          </span>
                        </div>
                      </div>
                      <div style={{ fontSize: "12px", lineHeight: 1.75, color: "rgba(255,255,255,0.55)", fontWeight: 300 }}>
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
                          padding: "8px 20px",
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                          fontSize: "9px",
                          color: "rgba(255,255,255,0.25)",
                          letterSpacing: "0.1em",
                          display: "flex",
                          justifyContent: "space-between",
                        }}>
                          <span>[ source ]</span>
                          <span>{mod.path}</span>
                        </div>
                        <pre style={{
                          padding: "16px 20px",
                          margin: 0,
                          fontSize: "11px",
                          lineHeight: 1.7,
                          color: "rgba(255,255,255,0.55)",
                          overflowX: "auto",
                          fontFamily: "inherit",
                          whiteSpace: "pre-wrap",
                        }}>
                          {mod.sourceSnippet.split("\n").map((line, li) => {
                            const isComment = line.trim().startsWith("//")
                            return (
                              <span key={li} style={{
                                display: "block",
                                color: isComment
                                  ? "rgba(255,255,255,0.25)"
                                  : "rgba(255,255,255,0.65)",
                              }}>
                                {line}
                              </span>
                            )
                          })}
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
                  padding: "20px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "8px",
                }}>
                  <div style={{
                    fontSize: "9px",
                    letterSpacing: "0.12em",
                    color: "rgba(255,255,255,0.3)",
                    marginBottom: "20px",
                  }}>
                    ACCOUNTABILITY SCORE · {analysis.meta.owner}/{analysis.meta.repo}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {analysis.score.map((dim, i) => (
                      <div key={i}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                          <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", fontWeight: 300 }}>
                            {dim.label}
                          </span>
                          <span style={{ fontSize: "11px", color: scoreColor(dim.pass), letterSpacing: "0.04em" }}>
                            {dim.verdictLabel}
                          </span>
                        </div>
                        <div style={{
                          height: "2px",
                          background: "rgba(255,255,255,0.06)",
                          borderRadius: "1px",
                          overflow: "hidden",
                        }}>
                          <div style={{
                            height: "100%",
                            width: dim.pass ? "85%" : "20%",
                            background: scoreColor(dim.pass),
                            borderRadius: "1px",
                            transition: "width 0.6s ease",
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{
                  padding: "20px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "8px",
                }}>
                  <div style={{
                    fontSize: "9px",
                    letterSpacing: "0.12em",
                    color: "rgba(255,255,255,0.3)",
                    marginBottom: "12px",
                  }}>
                    OVERALL VERDICT
                  </div>
                  <div style={{ fontSize: "13px", lineHeight: 1.8, color: "rgba(255,255,255,0.7)", fontWeight: 300 }}>
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
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
              [ listen to analysis ]
            </span>
            <select style={{
              flex: 1,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "6px",
              padding: "8px 12px",
              fontFamily: "inherit",
              fontSize: "12px",
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
        fontSize: "10px",
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
