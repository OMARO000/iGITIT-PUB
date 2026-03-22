"use client"

import { useState } from "react"
import Link from "next/link"

const S = {
  bg: "#0b0b0c",
  text: "rgba(255,255,255,0.88)",
  muted: "rgba(255,255,255,0.4)",
  dim: "rgba(255,255,255,0.2)",
  border: "rgba(255,255,255,0.07)",
  borderMid: "rgba(255,255,255,0.1)",
  amber: "#C4974A",
  green: "#4CAF7D",
  red: "#E05C5C",
  font: "'IBM Plex Mono', 'Courier New', monospace",
}

function CodeBlock({ code, lang = "" }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div style={{ position: "relative", background: "rgba(0,0,0,0.4)", border: `1px solid ${S.border}`, borderRadius: "6px", overflow: "hidden", marginTop: "12px", marginBottom: "4px" }}>
      {lang && (
        <div style={{ padding: "8px 16px", borderBottom: `1px solid ${S.border}`, fontSize: "11px", color: S.dim, letterSpacing: "0.08em", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{lang}</span>
          <button onClick={copy} style={{ background: "none", border: "none", fontFamily: S.font, fontSize: "11px", color: copied ? S.green : S.dim, cursor: "pointer", letterSpacing: "0.06em", padding: 0 }}>
            {copied ? "✓ copied" : "[ copy ]"}
          </button>
        </div>
      )}
      <pre style={{ margin: 0, padding: "20px", fontSize: "13px", lineHeight: 1.75, color: "rgba(255,255,255,0.75)", overflowX: "auto", fontFamily: S.font, whiteSpace: "pre" }}>
        {code}
      </pre>
    </div>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div id={id} style={{ marginBottom: "64px", scrollMarginTop: "80px" }}>
      <h2 style={{ fontSize: "22px", fontWeight: 500, color: S.text, letterSpacing: "0.02em", marginBottom: "24px", paddingBottom: "12px", borderBottom: `1px solid ${S.border}` }}>{title}</h2>
      {children}
    </div>
  )
}

function Param({ name, type, required, desc }: { name: string; type: string; required?: boolean; desc: string }) {
  return (
    <div style={{ padding: "14px 0", borderBottom: `1px solid ${S.border}`, display: "grid", gridTemplateColumns: "180px 80px 1fr", gap: "16px", alignItems: "start" }}>
      <div>
        <span style={{ fontSize: "13px", color: S.amber, fontFamily: S.font }}>{name}</span>
        {required && <span style={{ fontSize: "10px", color: S.red, marginLeft: "8px", letterSpacing: "0.06em" }}>required</span>}
      </div>
      <span style={{ fontSize: "12px", color: S.muted, fontFamily: S.font }}>{type}</span>
      <span style={{ fontSize: "13px", color: S.muted, lineHeight: 1.6, fontWeight: 300 }}>{desc}</span>
    </div>
  )
}

function ResponseField({ name, type, desc }: { name: string; type: string; desc: string }) {
  return (
    <div style={{ padding: "12px 0", borderBottom: `1px solid ${S.border}`, display: "grid", gridTemplateColumns: "200px 80px 1fr", gap: "16px", alignItems: "start" }}>
      <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", fontFamily: S.font }}>{name}</span>
      <span style={{ fontSize: "12px", color: S.dim, fontFamily: S.font }}>{type}</span>
      <span style={{ fontSize: "13px", color: S.muted, lineHeight: 1.6, fontWeight: 300 }}>{desc}</span>
    </div>
  )
}

const NAV = [
  { id: "overview", label: "Overview" },
  { id: "quickstart", label: "Quickstart" },
  { id: "endpoint", label: "API Endpoint" },
  { id: "response", label: "Response Schema" },
  { id: "embed", label: "Embed Widget" },
  { id: "rate-limits", label: "Rate Limits" },
  { id: "errors", label: "Error Codes" },
  { id: "examples", label: "Examples" },
]

export default function DocsPage() {
  const [activeNav, setActiveNav] = useState("overview")

  return (
    <div style={{ minHeight: "100dvh", background: S.bg, fontFamily: S.font, fontSize: "14px", color: S.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::selection { background: rgba(196,151,74,0.3); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        h3 { font-size: 16px; font-weight: 500; color: rgba(255,255,255,0.88); margin-bottom: 12px; margin-top: 28px; }
        p { font-size: 15px; line-height: 1.75; color: rgba(255,255,255,0.6); font-weight: 300; margin-bottom: 16px; }
        .nav-item:hover { color: rgba(255,255,255,0.7) !important; }
        a { color: inherit; }
      `}</style>

      {/* TOP BAR */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: S.bg, borderBottom: `1px solid ${S.border}`, padding: "14px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "20px" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <span style={{ fontSize: "22px", fontWeight: 500 }}>iGIT</span>
            <span style={{ fontSize: "22px", fontWeight: 300, opacity: 0.7 }}>it</span>
          </Link>
          <span style={{ fontSize: "13px", color: S.muted, letterSpacing: "0.08em" }}>api documentation</span>
        </div>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <span style={{ fontSize: "12px", padding: "4px 10px", border: `1px solid ${S.green}`, borderRadius: "4px", color: S.green, letterSpacing: "0.06em" }}>v1.0</span>
          <Link href="/" style={{ fontSize: "13px", color: S.muted, letterSpacing: "0.06em", textDecoration: "none" }}>← back to analyzer</Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", maxWidth: "1200px", margin: "0 auto" }}>

        {/* SIDEBAR NAV */}
        <div style={{ position: "sticky", top: "57px", height: "calc(100vh - 57px)", overflowY: "auto", padding: "40px 24px", borderRight: `1px solid ${S.border}` }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.12em", color: S.dim, marginBottom: "16px" }}>ON THIS PAGE</div>
          {NAV.map(item => (
            <a key={item.id} href={`#${item.id}`} className="nav-item" onClick={() => setActiveNav(item.id)} style={{ display: "block", padding: "7px 0", fontSize: "13px", color: activeNav === item.id ? S.amber : S.muted, letterSpacing: "0.04em", textDecoration: "none", transition: "color 0.15s", borderLeft: `2px solid ${activeNav === item.id ? S.amber : "transparent"}`, paddingLeft: "12px", marginLeft: "-2px" }}>
              {item.label}
            </a>
          ))}
          <div style={{ marginTop: "40px", paddingTop: "24px", borderTop: `1px solid ${S.border}` }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.12em", color: S.dim, marginBottom: "12px" }}>OMARO PBC</div>
            <a href="https://igitit.xyz" style={{ display: "block", fontSize: "12px", color: S.dim, textDecoration: "none", marginBottom: "8px" }}>igitit.xyz</a>
            <a href="https://omaro-pbc.org" style={{ display: "block", fontSize: "12px", color: S.dim, textDecoration: "none" }}>omaro-pbc.org</a>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div style={{ padding: "60px 64px 120px" }}>

          {/* OVERVIEW */}
          <Section id="overview" title="Overview">
            <p>The iGITit API lets you programmatically generate plain-language analysis of any public GitHub or GitLab repository. Built for journalists, regulators, researchers, and developers who need to understand what code actually does — without reading it.</p>
            <p>The API is free for public repositories. No API key required. Rate limited by IP.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginTop: "24px" }}>
              {[
                { label: "Base URL", value: "igitit.xyz/api/v1" },
                { label: "Format", value: "JSON" },
                { label: "Auth", value: "None (free tier)" },
              ].map(item => (
                <div key={item.label} style={{ padding: "16px 20px", background: "rgba(255,255,255,0.02)", border: `1px solid ${S.border}`, borderRadius: "6px" }}>
                  <div style={{ fontSize: "10px", letterSpacing: "0.1em", color: S.dim, marginBottom: "8px" }}>{item.label}</div>
                  <div style={{ fontSize: "14px", color: S.amber }}>{item.value}</div>
                </div>
              ))}
            </div>
          </Section>

          {/* QUICKSTART */}
          <Section id="quickstart" title="Quickstart">
            <p>Make a GET request with a repository URL. That&apos;s it.</p>
            <CodeBlock lang="curl" code={`curl "https://igitit.xyz/api/v1/analyze?repo=github.com/facebook/react"`} />
            <p>Or use the shorthand <span style={{ color: S.amber }}>owner/repo</span> format (defaults to GitHub):</p>
            <CodeBlock lang="curl" code={`curl "https://igitit.xyz/api/v1/analyze?repo=facebook/react"`} />
            <p>GitLab repositories:</p>
            <CodeBlock lang="curl" code={`curl "https://igitit.xyz/api/v1/analyze?repo=gitlab.com/owner/repository"`} />
          </Section>

          {/* ENDPOINT */}
          <Section id="endpoint" title="API Endpoint">
            <div style={{ padding: "16px 20px", background: "rgba(255,255,255,0.02)", border: `1px solid ${S.border}`, borderRadius: "6px", marginBottom: "24px", display: "flex", gap: "16px", alignItems: "center" }}>
              <span style={{ fontSize: "12px", padding: "3px 10px", background: "rgba(76,175,125,0.15)", border: `1px solid ${S.green}`, borderRadius: "4px", color: S.green }}>GET</span>
              <span style={{ fontSize: "14px", color: S.text }}>/api/v1/analyze</span>
            </div>

            <h3>Parameters</h3>
            <div style={{ borderTop: `1px solid ${S.border}` }}>
              <Param name="repo" type="string" required desc="Repository URL or owner/repo shorthand. Supports github.com and gitlab.com. Full URL or shorthand both work." />
            </div>

            <h3>Headers</h3>
            <div style={{ borderTop: `1px solid ${S.border}` }}>
              <Param name="Accept" type="string" desc="application/json (default)" />
            </div>

            <h3>Response Headers</h3>
            <div style={{ borderTop: `1px solid ${S.border}` }}>
              <Param name="X-RateLimit-Limit" type="integer" desc="Maximum requests per hour for this IP" />
              <Param name="X-RateLimit-Remaining" type="integer" desc="Requests remaining in current window" />
              <Param name="X-RateLimit-Reset" type="timestamp" desc="Unix timestamp when the rate limit window resets" />
            </div>
          </Section>

          {/* RESPONSE SCHEMA */}
          <Section id="response" title="Response Schema">
            <CodeBlock lang="json" code={`{
  "ok": true,
  "version": "1.0",
  "generatedAt": "2026-03-22T00:00:00.000Z",
  "repository": {
    "owner": "facebook",
    "repo": "react",
    "platform": "github",
    "language": "JavaScript",
    "stars": 244000,
    "fileCount": 6838,
    "license": "MIT License",
    "description": "The library for building user interfaces"
  },
  "analysis": {
    "overview": [
      { "title": "WHAT THIS SOFTWARE DOES", "content": "..." },
      { "title": "WHO IT SERVES", "content": "..." },
      { "title": "WHY IT WAS BUILT", "content": "..." },
      { "title": "LICENSE & USAGE RIGHTS", "content": "..." },
      { "title": "TECHNICAL ARCHITECTURE", "content": "..." }
    ],
    "dataItems": [
      {
        "type": "collect" | "store" | "send",
        "label": "Short label",
        "description": "Plain English explanation",
        "sourceLine": "path/to/file.ts - relevant context"
      }
    ],
    "dataFlowSummary": "Plain language data flow summary",
    "modules": [
      {
        "name": "Module Name",
        "path": "src/module/",
        "description": "Plain language explanation",
        "sourceSnippet": "relevant code excerpt"
      }
    ],
    "score": [
      {
        "label": "data minimization",
        "verdictLabel": "transparent",
        "pass": true,
        "reasoning": "Evidence-based explanation"
      }
    ],
    "overallVerdict": "Plain language overall assessment"
  },
  "meta": {
    "poweredBy": "iGITit",
    "generatedBy": "Claude (Anthropic)",
    "product": "OMARO PBC",
    "docsUrl": "https://igitit.xyz/docs",
    "embedUrl": "https://igitit.xyz/api/v1/embed?repo=..."
  }
}`} />

            <h3>Field Reference</h3>
            <div style={{ borderTop: `1px solid ${S.border}` }}>
              <ResponseField name="repository.owner" type="string" desc="Repository owner or organization name" />
              <ResponseField name="repository.license" type="string | null" desc="License name if detected, null if not found" />
              <ResponseField name="analysis.dataItems[].type" type="enum" desc='"collect" | "store" | "send" — categorizes how data is handled' />
              <ResponseField name="analysis.score[].pass" type="boolean" desc="Whether this dimension meets the transparency standard" />
              <ResponseField name="analysis.score[].reasoning" type="string" desc="Evidence-based 1-sentence explanation of the verdict" />
              <ResponseField name="meta.embedUrl" type="string" desc="Pre-built URL to embed this analysis as a widget" />
            </div>
          </Section>

          {/* EMBED WIDGET */}
          <Section id="embed" title="Embed Widget">
            <p>Add a live iGITit analysis widget to your documentation, README, or website. The widget fetches and renders the analysis automatically.</p>

            <h3>Basic embed</h3>
            <p>Add a container element and the script tag anywhere in your HTML:</p>
            <CodeBlock lang="html" code={`<!-- Container where the widget renders -->
<div id="igitit-embed"></div>

<!-- Widget script -->
<script src="https://igitit.xyz/api/v1/embed?repo=github.com/your/repo"></script>`} />

            <h3>Options</h3>
            <div style={{ borderTop: `1px solid ${S.border}`, marginBottom: "20px" }}>
              <Param name="repo" type="string" required desc="Repository URL or owner/repo shorthand" />
              <Param name="theme" type="string" desc='"dark" (default) or "light" — matches your site background' />
              <Param name="compact" type="boolean" desc='"true" renders a minimal badge-style widget with just the score. Default: false' />
            </div>

            <h3>Light theme</h3>
            <CodeBlock lang="html" code={`<div id="igitit-embed"></div>
<script src="https://igitit.xyz/api/v1/embed?repo=facebook/react&theme=light"></script>`} />

            <h3>Compact mode</h3>
            <CodeBlock lang="html" code={`<div id="igitit-embed"></div>
<script src="https://igitit.xyz/api/v1/embed?repo=facebook/react&compact=true"></script>`} />

            <h3>In a React/Next.js app</h3>
            <CodeBlock lang="tsx" code={`import Script from 'next/script'

export default function Page() {
  return (
    <>
      <div id="igitit-embed" />
      <Script
        src="https://igitit.xyz/api/v1/embed?repo=your/repo"
        strategy="lazyOnload"
      />
    </>
  )
}`} />

            <div style={{ marginTop: "20px", padding: "16px 20px", background: "rgba(196,151,74,0.06)", border: `1px solid rgba(196,151,74,0.2)`, borderRadius: "6px" }}>
              <div style={{ fontSize: "11px", letterSpacing: "0.1em", color: "rgba(196,151,74,0.6)", marginBottom: "8px" }}>POWERED BY IGITIT</div>
              <p style={{ marginBottom: 0, fontSize: "13px" }}>Every embed includes a &quot;powered by iGITit&quot; badge linking to igitit.xyz. This is how iGITit spreads — when your transparency is visible, you build trust with users, journalists, and regulators who can verify it.</p>
            </div>
          </Section>

          {/* RATE LIMITS */}
          <Section id="rate-limits" title="Rate Limits">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "24px" }}>
              {[
                { tier: "Free (current)", limit: "10 requests / hour", auth: "None", repos: "Public only" },
                { tier: "API (coming soon)", limit: "500 requests / hour", auth: "API key", repos: "Public + private" },
              ].map(t => (
                <div key={t.tier} style={{ padding: "20px", background: "rgba(255,255,255,0.02)", border: `1px solid ${S.border}`, borderRadius: "6px" }}>
                  <div style={{ fontSize: "11px", letterSpacing: "0.1em", color: S.dim, marginBottom: "12px" }}>{t.tier.toUpperCase()}</div>
                  <div style={{ fontSize: "16px", color: S.amber, marginBottom: "12px" }}>{t.limit}</div>
                  <div style={{ fontSize: "12px", color: S.muted }}>Auth: {t.auth}</div>
                  <div style={{ fontSize: "12px", color: S.muted }}>Repos: {t.repos}</div>
                </div>
              ))}
            </div>
            <p>Rate limit headers are returned with every response. When you exceed the limit, you&apos;ll receive a <span style={{ color: S.red }}>429</span> response with a <span style={{ color: S.amber }}>resetAt</span> timestamp.</p>
            <p>Embed widgets share the same rate limit as direct API calls. Cache responses client-side when possible — analyses are valid for the duration of the <span style={{ color: S.amber }}>Cache-Control: max-age=3600</span> header.</p>
          </Section>

          {/* ERRORS */}
          <Section id="errors" title="Error Codes">
            <div style={{ borderTop: `1px solid ${S.border}` }}>
              {[
                { code: "400", error: "missing_parameter", desc: "Required parameter repo is missing" },
                { code: "400", error: "invalid_repo", desc: "Repository URL could not be parsed" },
                { code: "429", error: "rate_limit_exceeded", desc: "IP has exceeded the hourly request limit" },
                { code: "502", error: "fetch_failed", desc: "Could not fetch the repository from GitHub/GitLab" },
                { code: "502", error: "analysis_failed", desc: "Claude analysis step failed" },
                { code: "500", error: "internal_error", desc: "Unexpected server error" },
              ].map(e => (
                <div key={e.error} style={{ padding: "14px 0", borderBottom: `1px solid ${S.border}`, display: "grid", gridTemplateColumns: "60px 200px 1fr", gap: "16px", alignItems: "start" }}>
                  <span style={{ fontSize: "13px", color: parseInt(e.code) >= 500 ? S.red : parseInt(e.code) >= 400 ? S.amber : S.green }}>{e.code}</span>
                  <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", fontFamily: S.font }}>{e.error}</span>
                  <span style={{ fontSize: "13px", color: S.muted, fontWeight: 300 }}>{e.desc}</span>
                </div>
              ))}
            </div>
            <h3>Error response format</h3>
            <CodeBlock lang="json" code={`{
  "error": "rate_limit_exceeded",
  "message": "Free tier: 10 requests per hour. Rate limit resets at 2026-03-22T01:00:00.000Z.",
  "resetAt": "2026-03-22T01:00:00.000Z",
  "docs": "https://igitit.xyz/docs"
}`} />
          </Section>

          {/* EXAMPLES */}
          <Section id="examples" title="Examples">
            <h3>JavaScript (fetch)</h3>
            <CodeBlock lang="javascript" code={`const response = await fetch(
  'https://igitit.xyz/api/v1/analyze?repo=github.com/facebook/react'
);
const data = await response.json();

if (data.ok) {
  console.log(data.analysis.overallVerdict);
  data.analysis.score.forEach(dim => {
    console.log(dim.label, dim.pass ? '✓' : '✗', dim.verdictLabel);
  });
}`} />

            <h3>Python</h3>
            <CodeBlock lang="python" code={`import requests

r = requests.get(
    'https://igitit.xyz/api/v1/analyze',
    params={'repo': 'github.com/facebook/react'}
)
data = r.json()

for item in data['analysis']['dataItems']:
    print(f"[{item['type'].upper()}] {item['label']}: {item['description']}")`} />

            <h3>Node.js</h3>
            <CodeBlock lang="javascript" code={`const https = require('https');

const url = 'https://igitit.xyz/api/v1/analyze?repo=github.com/torvalds/linux';

https.get(url, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const data = JSON.parse(body);
    console.log('License:', data.repository.license);
    console.log('Verdict:', data.analysis.overallVerdict);
  });
});`} />

            <h3>Check rate limit status</h3>
            <CodeBlock lang="curl" code={`curl -I "https://igitit.xyz/api/v1/analyze?repo=facebook/react"

# Response headers:
# X-RateLimit-Limit: 10
# X-RateLimit-Remaining: 7
# X-RateLimit-Reset: 1742601600`} />

            <div style={{ marginTop: "40px", padding: "24px 28px", background: "rgba(255,255,255,0.02)", border: `1px solid ${S.border}`, borderRadius: "8px" }}>
              <div style={{ fontSize: "11px", letterSpacing: "0.1em", color: S.dim, marginBottom: "12px" }}>USE CASES</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {[
                  "Journalists — programmatically audit dozens of repos in an investigation",
                  "Regulators — batch analyze all software used by regulated entities",
                  "Open source maintainers — embed transparency analysis directly in your docs",
                  "Compliance teams — integrate iGITit analysis into internal review pipelines",
                  "Researchers — build datasets of software accountability scores across industries",
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: "12px" }}>
                    <span style={{ color: S.amber, flexShrink: 0 }}>→</span>
                    <span style={{ fontSize: "14px", color: S.muted, fontWeight: 300, lineHeight: 1.6 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* FOOTER */}
          <div style={{ paddingTop: "40px", borderTop: `1px solid ${S.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ fontSize: "13px", color: S.dim }}>
              iGITit API v1.0 · powered by Claude · an <a href="https://omaro-pbc.org" style={{ color: S.amber, textDecoration: "none" }}>OMARO PBC</a> product
            </div>
            <Link href="/" style={{ fontSize: "13px", color: S.muted, textDecoration: "none", letterSpacing: "0.04em" }}>← back to analyzer</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
