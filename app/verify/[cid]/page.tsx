interface VerificationDoc {
  schema: string
  product: string
  organization: string
  generatedAt: string
  repository: {
    owner: string
    repo: string
    platform: string
    language: string
    stars: number
    fileCount: number
    license: string | null
    description: string | null
    sourceUrl: string
  }
  analysis: {
    overview: { title: string; content: string }[]
    dataItems: { type: "collect" | "store" | "send"; label: string; description: string; sourceLine?: string }[]
    dataFlowSummary: string
    modules: { name: string; path: string; description: string; sourceSnippet?: string }[]
    score: { label: string; verdictLabel: string; pass: boolean; reasoning?: string }[]
    overallVerdict: string
  }
  verification: {
    method: string
    hash: string
    note: string
  }
}

async function fetchFromIPFS(cid: string): Promise<VerificationDoc | null> {
  const gateways = [
    `https://gateway.pinata.cloud/ipfs/${cid}`,
    `https://ipfs.io/ipfs/${cid}`,
    `https://cloudflare-ipfs.com/ipfs/${cid}`,
  ]
  for (const url of gateways) {
    try {
      const res = await fetch(url, { next: { revalidate: 86400 } })
      if (res.ok) return await res.json()
    } catch { continue }
  }
  return null
}

const S = {
  bg: "#0b0b0c",
  text: "rgba(255,255,255,0.88)",
  muted: "rgba(255,255,255,0.4)",
  dim: "rgba(255,255,255,0.2)",
  border: "rgba(255,255,255,0.07)",
  amber: "#C4974A",
  green: "#4CAF7D",
  red: "#E05C5C",
  font: "'IBM Plex Mono', 'Courier New', monospace",
}

function card(children: React.ReactNode, style?: React.CSSProperties) {
  return (
    <div style={{ padding: "32px 36px", background: "rgba(255,255,255,0.02)", border: `1px solid ${S.border}`, borderRadius: "8px", marginBottom: "12px", ...style }}>
      {children}
    </div>
  )
}

function sectionLabel(text: string) {
  return <div style={{ fontSize: "11px", letterSpacing: "0.12em", color: S.muted, marginBottom: "14px" }}>{text}</div>
}

function bodyText(text: string) {
  return <div style={{ fontSize: "16px", lineHeight: 1.75, color: "rgba(255,255,255,0.78)", fontWeight: 300 }}>{text}</div>
}

function dataColor(type: "collect" | "store" | "send") {
  if (type === "collect") return S.amber
  if (type === "store") return S.green
  return S.red
}

function scoreColor(pass: boolean) { return pass ? S.green : S.red }

export default async function VerifyPage({ params }: { params: Promise<{ cid: string }> }) {
  const resolved = await params
  const cid = resolved?.cid ?? ""
  const doc = await fetchFromIPFS(cid)

  const baseStyle: React.CSSProperties = {
    minHeight: "100dvh",
    background: S.bg,
    fontFamily: S.font,
    fontSize: "14px",
    color: S.text,
    padding: "48px 40px 120px",
    maxWidth: "960px",
    margin: "0 auto",
  }

  if (!doc) {
    return (
      <div style={baseStyle}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500&display=swap'); * { box-sizing: border-box; }`}</style>
        <div style={{ marginBottom: "40px", paddingBottom: "20px", borderBottom: `1px solid ${S.border}` }}>
          <a href="/" style={{ textDecoration: "none", color: S.text }}>
            <span style={{ fontSize: "28px", fontWeight: 500 }}>iGIT</span>
            <span style={{ fontSize: "28px", fontWeight: 300, opacity: 0.7 }}>it</span>
          </a>
        </div>
        <div style={{ padding: "40px", background: "rgba(224,92,92,0.06)", border: "1px solid rgba(224,92,92,0.2)", borderRadius: "8px" }}>
          <div style={{ fontSize: "13px", color: S.red, letterSpacing: "0.08em", marginBottom: "12px" }}>VERIFICATION FAILED</div>
          <div style={{ fontSize: "16px", color: "rgba(255,255,255,0.7)", fontWeight: 300, lineHeight: 1.75 }}>
            Could not retrieve analysis from IPFS. The CID <span style={{ color: S.amber, fontFamily: S.font }}>{cid}</span> may be invalid, unpinned, or temporarily unavailable.
          </div>
          <div style={{ marginTop: "16px", fontSize: "13px", color: S.muted }}>
            Try again later, or check the CID directly at{" "}
            <a href={`https://gateway.pinata.cloud/ipfs/${cid}`} target="_blank" rel="noopener noreferrer" style={{ color: S.amber }}>
              gateway.pinata.cloud/ipfs/{cid}
            </a>
          </div>
        </div>
      </div>
    )
  }

  const repo = doc.repository
  const analysis = doc.analysis
  const verification = doc.verification

  return (
    <div style={baseStyle}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; }
        ::selection { background: rgba(196,151,74,0.3); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>

      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "40px", paddingBottom: "20px", borderBottom: `1px solid ${S.border}` }}>
        <a href="/" style={{ textDecoration: "none", color: S.text }}>
          <span style={{ fontSize: "28px", fontWeight: 500 }}>iGIT</span>
          <span style={{ fontSize: "28px", fontWeight: 300, opacity: 0.7 }}>it</span>
        </a>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <div style={{ fontSize: "12px", padding: "4px 12px", background: "rgba(76,175,125,0.1)", border: `1px solid ${S.green}`, borderRadius: "4px", color: S.green, letterSpacing: "0.08em" }}>
            ✓ VERIFIED
          </div>
          <div style={{ fontSize: "12px", color: S.muted, border: `1px solid ${S.border}`, padding: "4px 12px", borderRadius: "4px" }}>OMARO PBC</div>
        </div>
      </div>

      {/* VERIFICATION BANNER */}
      <div style={{ padding: "24px 28px", background: "rgba(76,175,125,0.05)", border: `1px solid rgba(76,175,125,0.2)`, borderRadius: "8px", marginBottom: "32px" }}>
        <div style={{ fontSize: "11px", letterSpacing: "0.12em", color: "rgba(76,175,125,0.6)", marginBottom: "16px" }}>
          CRYPTOGRAPHIC VERIFICATION RECORD
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "16px" }}>
          <div>
            <div style={{ fontSize: "11px", color: S.dim, marginBottom: "6px", letterSpacing: "0.08em" }}>IPFS CID</div>
            <div style={{ fontSize: "12px", color: S.amber, wordBreak: "break-all", lineHeight: 1.5 }}>{cid}</div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: S.dim, marginBottom: "6px", letterSpacing: "0.08em" }}>SHA-256 HASH</div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", wordBreak: "break-all", lineHeight: 1.5 }}>{verification.hash}</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", paddingTop: "16px", borderTop: `1px solid rgba(76,175,125,0.1)` }}>
          <div>
            <div style={{ fontSize: "11px", color: S.dim, marginBottom: "6px", letterSpacing: "0.08em" }}>PINNED AT</div>
            <div style={{ fontSize: "12px", color: S.muted }}>{new Date(doc.generatedAt).toUTCString()}</div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: S.dim, marginBottom: "6px", letterSpacing: "0.08em" }}>HASH METHOD</div>
            <div style={{ fontSize: "12px", color: S.muted }}>{verification.method}</div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: S.dim, marginBottom: "6px", letterSpacing: "0.08em" }}>IPFS GATEWAY</div>
            <a href={`https://gateway.pinata.cloud/ipfs/${cid}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: S.amber, textDecoration: "none" }}>
              view raw ↗
            </a>
          </div>
        </div>
        <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: `1px solid rgba(76,175,125,0.1)`, fontSize: "12px", color: S.dim, lineHeight: 1.6 }}>
          {verification.note}
        </div>
      </div>

      {/* REPO META */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", marginBottom: "6px" }}>
          <div style={{ fontSize: "20px", fontWeight: 500 }}>{repo.owner}/{repo.repo}</div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", padding: "3px 10px", border: `1px solid ${S.border}`, borderRadius: "4px", color: S.muted }}>{repo.platform}</span>
            {repo.language && <span style={{ fontSize: "12px", padding: "3px 10px", border: `1px solid ${S.border}`, borderRadius: "4px", color: S.muted }}>{repo.language}</span>}
            <span style={{ fontSize: "12px", padding: "3px 10px", border: `1px solid ${S.border}`, borderRadius: "4px", color: S.muted }}>★ {repo.stars}</span>
            <span style={{ fontSize: "12px", padding: "3px 10px", border: `1px solid ${S.border}`, borderRadius: "4px", color: S.muted }}>{repo.fileCount} files</span>
            {repo.license && <span style={{ fontSize: "12px", padding: "3px 10px", border: `1px solid rgba(196,151,74,0.3)`, borderRadius: "4px", color: S.amber }}>{repo.license}</span>}
          </div>
        </div>
        {repo.description && <div style={{ fontSize: "14px", color: S.muted, lineHeight: 1.6 }}>{repo.description}</div>}
        <div style={{ marginTop: "8px" }}>
          <a href={repo.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: S.amber, opacity: 0.7, textDecoration: "none" }}>
            {repo.sourceUrl} ↗
          </a>
        </div>
      </div>

      {/* ANALYSIS — full re-render */}

      {/* OVERVIEW */}
      <div style={{ marginBottom: "8px", fontSize: "11px", letterSpacing: "0.12em", color: S.dim }}>OVERVIEW</div>
      {analysis.overview.map((section, i) => (
        <div key={i}>
          {card(<>
            {sectionLabel(section.title)}
            {bodyText(section.content)}
          </>, { marginBottom: i < analysis.overview.length - 1 ? "8px" : "24px" })}
        </div>
      ))}

      {/* DATA NARRATIVE */}
      <div style={{ marginBottom: "8px", fontSize: "11px", letterSpacing: "0.12em", color: S.dim }}>DATA NARRATIVE</div>
      {card(<>
        {sectionLabel("DATA THIS SOFTWARE TOUCHES")}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {analysis.dataItems.map((item, i) => (
            <div key={i} style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: dataColor(item.type), flexShrink: 0, marginTop: "6px" }} />
              <div>
                <span style={{ fontSize: "15px", color: "rgba(255,255,255,0.82)" }}>{item.label}</span>
                <span style={{ fontSize: "15px", color: S.muted, fontWeight: 300 }}> — {item.description}</span>
                {item.sourceLine && <div style={{ marginTop: "3px", fontSize: "11px", color: S.amber, opacity: 0.7 }}>→ {item.sourceLine}</div>}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: "16px", marginTop: "20px", paddingTop: "16px", borderTop: `1px solid ${S.border}` }}>
          {[{ color: S.amber, label: "collected" }, { color: S.green, label: "stored" }, { color: S.red, label: "transmitted" }].map(({ color, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: color }} />
              <span style={{ fontSize: "11px", color: S.dim }}>{label}</span>
            </div>
          ))}
        </div>
      </>)}

      {card(<>
        {sectionLabel("DATA FLOW SUMMARY")}
        {bodyText(analysis.dataFlowSummary)}
      </>, { marginBottom: "24px" })}

      {/* MODULE BREAKDOWN */}
      <div style={{ marginBottom: "8px", fontSize: "11px", letterSpacing: "0.12em", color: S.dim }}>MODULE BREAKDOWN</div>
      <div style={{ marginBottom: "24px" }}>
        {analysis.modules.map((mod, i) => (
          <div key={i} style={{ border: `1px solid ${S.border}`, borderRadius: "8px", overflow: "hidden", marginBottom: "8px" }}>
            <div style={{ padding: "20px 28px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <span style={{ fontSize: "15px", fontWeight: 500, color: "rgba(255,255,255,0.88)" }}>{mod.name}</span>
                {mod.path && <span style={{ fontSize: "11px", padding: "2px 8px", background: "rgba(255,255,255,0.05)", borderRadius: "3px", color: S.dim }}>{mod.path}</span>}
              </div>
              <div style={{ fontSize: "15px", lineHeight: 1.75, color: S.muted, fontWeight: 300 }}>{mod.description}</div>
            </div>
            {mod.sourceSnippet && (
              <div style={{ borderTop: `1px solid ${S.border}`, background: "rgba(0,0,0,0.3)" }}>
                <pre style={{ padding: "16px 28px", margin: 0, fontSize: "12px", lineHeight: 1.7, overflowX: "auto", fontFamily: S.font, whiteSpace: "pre-wrap" }}>
                  {mod.sourceSnippet.split("\n").map((line, li) => (
                    <span key={li} style={{ display: "block", color: line.trim().startsWith("//") ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.6)" }}>{line}</span>
                  ))}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ACCOUNTABILITY SCORE */}
      <div style={{ marginBottom: "8px", fontSize: "11px", letterSpacing: "0.12em", color: S.dim }}>ACCOUNTABILITY SCORE</div>
      {card(<>
        {sectionLabel(`ACCOUNTABILITY SCORE · ${repo.owner}/${repo.repo}`)}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {analysis.score.map((dim, i) => (
            <div key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "7px" }}>
                <span style={{ fontSize: "15px", color: S.muted, fontWeight: 300 }}>{dim.label}</span>
                <span style={{ fontSize: "13px", color: scoreColor(dim.pass), letterSpacing: "0.04em" }}>{dim.verdictLabel}</span>
              </div>
              <div style={{ height: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden", marginBottom: dim.reasoning ? "7px" : 0 }}>
                <div style={{ height: "100%", width: dim.pass ? "85%" : "20%", background: scoreColor(dim.pass), borderRadius: "2px" }} />
              </div>
              {dim.reasoning && <div style={{ fontSize: "12px", color: S.dim, lineHeight: 1.6, fontStyle: "italic" }}>{dim.reasoning}</div>}
            </div>
          ))}
        </div>
      </>)}

      {card(<>
        {sectionLabel("OVERALL VERDICT")}
        {bodyText(analysis.overallVerdict)}
      </>, { marginBottom: "40px" })}

      {/* PERMANENT RECORD FOOTER */}
      <div style={{ padding: "24px 28px", background: "rgba(196,151,74,0.04)", border: `1px solid rgba(196,151,74,0.15)`, borderRadius: "8px", marginBottom: "40px" }}>
        <div style={{ fontSize: "11px", letterSpacing: "0.12em", color: "rgba(196,151,74,0.5)", marginBottom: "14px" }}>PERMANENT RECORD</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          {[
            { label: "IPFS CID", value: cid, href: `https://gateway.pinata.cloud/ipfs/${cid}` },
            { label: "IPFS URI", value: `ipfs://${cid}`, href: `https://gateway.pinata.cloud/ipfs/${cid}` },
            { label: "Verify URL", value: `igitit.xyz/verify/${cid}`, href: undefined },
            { label: "Pinned", value: new Date(doc.generatedAt).toUTCString(), href: undefined },
          ].map(item => (
            <div key={item.label}>
              <div style={{ fontSize: "10px", color: S.dim, letterSpacing: "0.08em", marginBottom: "5px" }}>{item.label}</div>
              {item.href ? (
                <a href={item.href} target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: S.amber, textDecoration: "none", wordBreak: "break-all" }}>{item.value}</a>
              ) : (
                <div style={{ fontSize: "12px", color: S.muted, wordBreak: "break-all" }}>{item.value}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ paddingTop: "20px", borderTop: `1px solid ${S.border}`, fontSize: "13px", color: S.dim, lineHeight: 1.7, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
        <div>generated by iGITit · powered by Claude · an OMARO PBC product</div>
        <a href="/" style={{ color: S.amber, textDecoration: "none", opacity: 0.7 }}>analyze another repo →</a>
      </div>
    </div>
  )
}
