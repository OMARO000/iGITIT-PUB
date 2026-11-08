/**
 * Shareable link to a reading: omaro.xyz/igitit/r/<host>/<owner>/<repo>. Shows the newest stored reading of the
 * repository and never starts a new one, so a shared link costs nothing however often it's opened.
 */
import type { Metadata } from "next"
import { HAI_PILLARS, haiGrade, haiOf } from "@/app/lib/hai"
import { parseRepo, repoKey } from "@/app/lib/repo"
import { latestReading } from "@/app/lib/store"

export const dynamic = "force-dynamic"

const C = { bg: "#0b0b0c", text: "rgba(255,255,255,0.88)", muted: "rgba(255,255,255,0.55)", dim: "rgba(255,255,255,0.32)", line: "rgba(255,255,255,0.08)", collect: "#4A9EF0", store: "#4CAF7D", send: "#E05C5C", accent: "#C4974A" }
type Reading = { analysis: Record<string, unknown>; meta: Record<string, unknown> }
type Props = { params: Promise<{ path: string[] }> }

const address = (path: string[]) => path.map(decodeURIComponent).join("/")

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = address((await params).path)
  return { title: `${a} · iGITit reading`, description: `What ${a}'s code does with people's data, in plain language. Read by iGITit, governed by OMARO PBC.` }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ borderTop: `1px solid ${C.line}`, padding: "22px 0" }}>
      <h2 style={{ fontSize: 11, letterSpacing: "0.12em", color: C.dim, margin: "0 0 12px", fontWeight: 500 }}>{title}</h2>
      {children}
    </section>
  )
}

export default async function SharedReading({ params }: Props) {
  const a = address((await params).path)
  const ref = parseRepo(`https://${a}`)
  const stored = ref ? await latestReading<Reading>("analysis", repoKey(ref)).catch(() => null) : null
  const shell = (body: React.ReactNode) => (
    <main style={{ background: C.bg, color: C.text, minHeight: "100vh", fontFamily: "'IBM Plex Mono', monospace", padding: "40px 20px" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.14em", color: C.dim }}>iGITit · A READING SHARED FROM IRIS BY OMARO</div>
        {body}
        <p style={{ marginTop: 40, fontSize: 12, color: C.dim }}>
          Read it yourself with <a href="https://omaro.xyz/iris" style={{ color: C.accent }}>IRIS by OMARO</a>. API and method: <a href="/igitit/docs" style={{ color: C.accent }}>omaro.xyz/igitit/docs</a>. A reading reflects the repository at the commit shown; it isn&apos;t legal or compliance advice.
        </p>
      </div>
    </main>
  )
  if (!ref) return shell(<p style={{ marginTop: 24 }}>That address isn&apos;t a GitHub, GitLab, Codeberg or Radicle repository.</p>)
  if (!stored) return shell(<><h1 style={{ fontSize: 24, margin: "16px 0" }}>{a}</h1><p style={{ color: C.muted }}>iGITit hasn&apos;t read this repository yet. Open it in Firefox with IRIS and choose &quot;Read this code with iGITit&quot;.</p></>)

  const an = stored.result.analysis, m = stored.result.meta
  const hai = haiOf(an), g = haiGrade(hai)
  const overview = (an.overview as { title: string; content: string }[] | undefined) ?? []
  const items = (an.dataItems as { type: "collect" | "store" | "send"; label: string; description: string }[] | undefined) ?? []
  const signals = ((an.uxEthics as { signals?: { pattern: string; description: string; severity: string }[] } | undefined)?.signals) ?? []
  const ml = an.ml as { detected?: boolean; summary?: string; models?: { name?: string; use?: string; hub?: { url: string; cardPresent: boolean } }[]; modelCard?: { present?: boolean; gaps?: string } } | undefined
  const commit = String(m.commit ?? stored.commit ?? "").slice(0, 7)

  return shell(<>
    <h1 style={{ fontSize: 26, margin: "16px 0 6px" }}>{String(m.owner)}/{String(m.repo)}</h1>
    <div style={{ fontSize: 13, color: C.muted }}>{[m.platform, m.language, m.license ?? "no license file"].filter(Boolean).join(" · ")}</div>
    <div style={{ fontSize: 12, color: C.dim, marginTop: 6 }}>Read on {stored.readAt.slice(0, 10)}{commit ? ` at commit ${commit}` : ""}</div>
    <Section title="OVERVIEW">{overview.map((o) => <div key={o.title} style={{ marginBottom: 12 }}><div style={{ fontSize: 12, color: C.dim }}>{o.title}</div><p style={{ margin: "4px 0", lineHeight: 1.7 }}>{o.content}</p></div>)}</Section>
    <Section title="COLLECT · STORE · SEND">
      {items.map((d, i) => <p key={i} style={{ margin: "0 0 10px", lineHeight: 1.6 }}><span style={{ color: C[d.type] ?? C.muted, fontSize: 11, marginRight: 8 }}>{d.type.toUpperCase()}</span><strong>{d.label}</strong>: {d.description}</p>)}
      {typeof an.dataFlowSummary === "string" && <p style={{ color: C.muted, lineHeight: 1.6 }}>{an.dataFlowSummary}</p>}
    </Section>
    <Section title={`HAI STANDARD · ${g.total} OF ${g.max} · GRADE ${g.grade}`}>
      {HAI_PILLARS.map((p) => { const v = hai[p.id]; return v ? <p key={p.id} style={{ margin: "0 0 10px", lineHeight: 1.6 }}><strong>{p.id}. {p.name}: {v.score}/5.</strong> <span style={{ color: C.muted }}>{v.finding}</span></p> : <p key={p.id} style={{ margin: "0 0 10px", color: C.dim }}>{p.id}. {p.name}: not scored in this reading.</p> })}
    </Section>
    {ml && <Section title="MACHINE LEARNING">
      <p style={{ lineHeight: 1.6 }}>{ml.summary ?? (ml.detected ? "Machine learning found." : "No machine learning found in the files read.")}</p>
      {(ml.models ?? []).map((x, i) => <p key={i} style={{ margin: "0 0 8px", color: C.muted }}>{x.name}{x.use ? `: ${x.use}` : ""}{x.hub ? <> · <a href={x.hub.url} style={{ color: C.accent }}>Hugging Face</a>{x.hub.cardPresent ? " (model card)" : " (no model card)"}</> : null}</p>)}
      {ml.detected && ml.modelCard && <p style={{ color: C.muted }}>Model card: {ml.modelCard.present ? "present" : "none found"}. {ml.modelCard.gaps ?? ""}</p>}
    </Section>}
    <Section title="DARK PATTERNS IN THE CODE">
      {signals.length ? signals.map((s, i) => <p key={i} style={{ margin: "0 0 8px", lineHeight: 1.6 }}><strong>{s.pattern}</strong> ({s.severity}): {s.description}</p>) : <p style={{ color: C.muted }}>None of the eight patterns found.</p>}
    </Section>
    {typeof an.platformContext === "string" && <Section title="THE ORGANIZATION"><p style={{ lineHeight: 1.6 }}>{an.platformContext}</p></Section>}
    {typeof an.overallVerdict === "string" && <Section title="OVERALL"><p style={{ lineHeight: 1.6 }}>{an.overallVerdict}</p></Section>}
  </>)
}
