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
  { id: "endpoint", label: "API Endpoints" },
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
          <a href="https://omaro.xyz" style={{ fontSize: "13px", color: S.muted, letterSpacing: "0.06em", textDecoration: "none" }}>OMARO</a>
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
            <a href="https://omaro.xyz" style={{ display: "block", fontSize: "12px", color: S.dim, textDecoration: "none", marginBottom: "8px" }}>omaro.xyz</a>
            <a href="https://omaro-pbc.org" style={{ display: "block", fontSize: "12px", color: S.dim, textDecoration: "none" }}>omaro-pbc.org</a>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div style={{ padding: "60px 64px 120px" }}>

          {/* OVERVIEW */}
          <Section id="overview" title="Overview">
            <p>The iGITit API lets you programmatically generate plain-language analysis of any public GitHub, GitLab, Codeberg or Radicle repository. Built for journalists, regulators, researchers, and developers who need to understand what code does without reading it.</p>
            <p>The API is free for public repositories, with no key. iGITit lives in IRIS by OMARO; this API serves IRIS and anyone building on public code readings.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginTop: "24px" }}>
              {[
                { label: "Base URL", value: "omaro.xyz/igitit/api/v1" },
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
            <CodeBlock lang="curl" code={`curl "https://omaro.xyz/igitit/api/v1/analyze?repo=github.com/facebook/react"`} />
            <p>Or use the shorthand <span style={{ color: S.amber }}>owner/repo</span> format (defaults to GitHub):</p>
            <CodeBlock lang="curl" code={`curl "https://omaro.xyz/igitit/api/v1/analyze?repo=facebook/react"`} />
            <p>GitLab repositories:</p>
            <CodeBlock lang="curl" code={`curl "https://omaro.xyz/igitit/api/v1/analyze?repo=gitlab.com/owner/repository"`} />
          </Section>

          {/* ENDPOINT */}
          <Section id="endpoint" title="API Endpoints">
            <p>Every endpoint takes public repository addresses only and answers in JSON. Readings are stored by repository and commit, so most answers come from the store at no cost.</p>
            {[
              { m: "GET", path: "/api/v1/analyze?repo=", desc: "The full analysis of one repository (GitHub, GitLab, Codeberg or Radicle)." },
              { m: "GET", path: "/api/v1/compare?a=&b=", desc: "Two repositories side by side, in plain language." },
              { m: "GET", path: "/api/v1/changelog?repo=&depth=10", desc: "The latest commits (up to 25), each routine, notable or flagged." },
              { m: "GET", path: "/api/v1/companies?q=", desc: "A company's public repositories, found by name." },
              { m: "GET", path: "/api/v1/companies?site=example.com", desc: "A company's public repositories, found from its website. Says so when its code is private or none is published." },
              { m: "PAGE", path: "/r/github.com/owner/repo", desc: "A shareable page with the newest stored reading. Opening it never starts a new reading." },
              { m: "POST", path: "/api/v1/verify", desc: "Seals iGITit's reading of a repository and pins it to IPFS. Body: { \"repo\": \"github.com/owner/repo\" }." },
            ].map((e) => (
              <div key={e.path} style={{ padding: "14px 20px", background: "rgba(255,255,255,0.02)", border: `1px solid ${S.border}`, borderRadius: "6px", marginBottom: "10px" }}>
                <div style={{ display: "flex", gap: "16px", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ fontSize: "12px", padding: "3px 10px", background: "rgba(76,175,125,0.15)", border: `1px solid ${S.green}`, borderRadius: "4px", color: S.green }}>{e.m}</span>
                  <span style={{ fontSize: "14px", color: S.text }}>{e.path}</span>
                </div>
                <div style={{ fontSize: "13px", color: S.dim }}>{e.desc}</div>
              </div>
            ))}

            <h3>Parameters</h3>
            <div style={{ borderTop: `1px solid ${S.border}` }}>
              <Param name="repo, a, b" type="string" required desc="A repository address or owner/repo shorthand (GitHub). github.com, gitlab.com (groups included), codeberg.org and app.radicle.xyz are supported." />
              <Param name="depth" type="integer" desc="Changelog only: how many recent commits to explain, 1 to 25 (default 10)." />
              <Param name="q" type="string" required desc="Companies only: a company or product name." />
            </div>

            <h3>Response Headers</h3>
            <div style={{ borderTop: `1px solid ${S.border}` }}>
              <Param name="X-Fresh-Readings-Remaining" type="integer" desc="Fresh readings left for this address this hour" />
              <Param name="X-Fresh-Readings-Reset" type="timestamp" desc="Unix time when the count resets" />
            </div>
          </Section>

          {/* RESPONSE SCHEMA */}
          <Section id="response" title="Response Schema">
            <CodeBlock lang="json" code={`{
  "ok": true,
  "version": "1.2",
  "repository": { "owner": "signalapp", "repo": "Signal-Android", "platform": "GitHub", "language": "Kotlin", "stars": 26000, "license": "AGPL-3.0", "commit": "3f2a…" },
  "commit": "3f2a…",
  "readAt": "2026-11-08T07:17:00.000Z",
  "stored": { "readAt": "…", "commit": "3f2a…", "current": true, "carriedFrom": "9c1e…", "why": "4 changed files, none about data, sign-in, tracking, dependencies or privacy" },
  "analysis": {
    "overview": [{ "title": "WHAT THIS SOFTWARE DOES", "content": "…" }],
    "dataItems": [{ "type": "collect", "label": "Phone number", "description": "…", "sourceLine": "…" }],
    "dataFlowSummary": "…",
    "modules": [{ "name": "…", "path": "…", "description": "…", "sourceSnippet": "…" }],
    "hai": { "I": { "score": 4, "finding": "…" }, "II": { "score": 3, "finding": "…" }, "VIII": { "score": 2, "finding": "…" } },
    "ml": { "detected": true, "summary": "…", "models": [{ "name": "…", "use": "…", "huggingFace": "owner/model", "hub": { "cardPresent": true, "license": "apache-2.0", "task": "text-classification", "url": "https://huggingface.co/owner/model" } }], "modelCard": { "present": false, "gaps": "…" } },
    "uxEthics": { "signals": [{ "pattern": "pre-checked-consent", "description": "…", "severity": "high" }], "summary": "…" },
    "platformContext": "…",
    "overallVerdict": "…"
  }
}`} />
            <h3>Stored readings</h3>
            <p><code>stored</code> is present when the answer came from the store: <code>current</code> is true when it covers the repository's current commit, either read at it or carried forward because nothing that could change the reading was touched since (<code>why</code> says what changed). <code>current: false</code> means an older reading, shown because today's reading budget or this address's fresh readings are used up.</p>
            <h3>HAI score</h3>
            <p><code>hai</code> holds the nine pillars of the HAI Standard v1.1, each 1 to 5: I Integrity &amp; Transparency, II Accountability Chain, III Safety &amp; Robustness, IV Equality &amp; Non-Discrimination, V Human Override &amp; Control, VI Use Limits &amp; Proportionality, VII Data Ownership &amp; Empowerment, VIII Independent Audit, IX Human Dignity Across the Full Stack. Out of 45: A at 41 or more, B 34, C 27, D 18, F below. Readings made before November 8, 2026 used an earlier set and leave VIII unscored.</p>
            <h3>Machine learning</h3>
            <p><code>ml</code> says whether the code trains, loads or calls a machine learning model, lists each model, adds Hugging Face&apos;s public facts for models loaded from there, and says whether a model card exists and what it leaves out.</p>
          </Section>

          {/* EMBED WIDGET */}
          <Section id="embed" title="Embed Widget">
            <p>Add a live iGITit analysis widget to your documentation, README, or website. The widget fetches and renders the analysis automatically.</p>

            <h3>Basic embed</h3>
            <p>Add a container element and the script tag anywhere in your HTML:</p>
            <CodeBlock lang="html" code={`<!-- Container where the widget renders -->
<div id="igitit-embed"></div>

<!-- Widget script -->
<script src="https://omaro.xyz/igitit/api/v1/embed?repo=github.com/your/repo"></script>`} />

            <h3>Options</h3>
            <div style={{ borderTop: `1px solid ${S.border}`, marginBottom: "20px" }}>
              <Param name="repo" type="string" required desc="Repository URL or owner/repo shorthand" />
              <Param name="theme" type="string" desc='"dark" (default) or "light", to match your site' />
              <Param name="compact" type="boolean" desc='"true" renders a minimal badge-style widget with just the score. Default: false' />
            </div>

            <h3>Light theme</h3>
            <CodeBlock lang="html" code={`<div id="igitit-embed"></div>
<script src="https://omaro.xyz/igitit/api/v1/embed?repo=facebook/react&theme=light"></script>`} />

            <h3>Compact mode</h3>
            <CodeBlock lang="html" code={`<div id="igitit-embed"></div>
<script src="https://omaro.xyz/igitit/api/v1/embed?repo=facebook/react&compact=true"></script>`} />

            <h3>In a React/Next.js app</h3>
            <CodeBlock lang="tsx" code={`import Script from 'next/script'

export default function Page() {
  return (
    <>
      <div id="igitit-embed" />
      <Script
        src="https://omaro.xyz/igitit/api/v1/embed?repo=your/repo"
        strategy="lazyOnload"
      />
    </>
  )
}`} />

            <div style={{ marginTop: "20px", padding: "16px 20px", background: "rgba(196,151,74,0.06)", border: `1px solid rgba(196,151,74,0.2)`, borderRadius: "6px" }}>
              <div style={{ fontSize: "11px", letterSpacing: "0.1em", color: "rgba(196,151,74,0.6)", marginBottom: "8px" }}>POWERED BY IGITIT</div>
              <p style={{ marginBottom: 0, fontSize: "13px" }}>Every embed includes a &quot;powered by iGITit&quot; badge linking to omaro.xyz/igitit. Your users, journalists and regulators can check the reading for themselves.</p>
            </div>
          </Section>

          {/* RATE LIMITS */}
          <Section id="rate-limits" title="Rate Limits">
            <p>Stored readings are free and unlimited. A fresh reading (a repository commit nobody has read yet) costs a model call, so each address gets <strong>10 fresh readings an hour</strong>. When they're used up, the API answers from the store and marks older readings <code>current: false</code>.</p>
            <p>iGITit also has a daily reading budget. When it's used up, new readings resume after midnight UTC; stored readings stay available.</p>
          </Section>

          {/* ERRORS */}
          <Section id="errors" title="Error Codes">
            <div style={{ borderTop: `1px solid ${S.border}` }}>
              <Param name="400 missing_parameter" type="error" desc="A required parameter is missing." />
              <Param name="400 invalid_repo" type="error" desc="The address isn't a GitHub, GitLab or Radicle repository, or has no readable files." />
              <Param name="429 fresh_limit_reached" type="error" desc="This address used its fresh readings for the hour and nothing is stored for this repository yet." />
              <Param name="503 budget_reached" type="error" desc="Today's reading budget is used up and nothing is stored for this repository yet." />
              <Param name="502 reading_failed" type="error" desc="The repository couldn't be read, or the reading failed." />
            </div>
            <CodeBlock lang="json" code={`{ "ok": false, "error": "fresh_limit_reached", "message": "…", "docs": "https://omaro.xyz/igitit/docs" }`} />
          </Section>

          {/* EXAMPLES */}
          <Section id="examples" title="Examples">
            <h3>JavaScript (fetch)</h3>
            <CodeBlock lang="javascript" code={`const response = await fetch(
  'https://omaro.xyz/igitit/api/v1/analyze?repo=github.com/facebook/react'
);
const data = await response.json();

if (data.ok) {
  console.log(data.analysis.overallVerdict);
  for (const [pillar, { score, finding }] of Object.entries(data.analysis.hai)) {
    console.log(pillar, score + '/5', finding);
  }
}`} />

            <h3>Python</h3>
            <CodeBlock lang="python" code={`import requests

r = requests.get(
    'https://omaro.xyz/igitit/api/v1/analyze',
    params={'repo': 'github.com/facebook/react'}
)
data = r.json()

for item in data['analysis']['dataItems']:
    print(f"[{item['type'].upper()}] {item['label']}: {item['description']}")`} />

            <h3>Node.js</h3>
            <CodeBlock lang="javascript" code={`const https = require('https');

const url = 'https://omaro.xyz/igitit/api/v1/analyze?repo=github.com/torvalds/linux';

https.get(url, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const data = JSON.parse(body);
    console.log('License:', data.repository.license);
    console.log('Verdict:', data.analysis.overallVerdict);
  });
});`} />

            <h3>Seal a reading</h3>
            <CodeBlock lang="curl" code={`curl -X POST "https://omaro.xyz/igitit/api/v1/verify" \\
  -H "Content-Type: application/json" \\
  -d '{"repo":"github.com/signalapp/Signal-Android"}'

# { "ok": true, "cid": "bafy…", "hash": "…", "verifyUrl": "https://omaro.xyz/igitit/verify/bafy…", "existing": false }`} />

            <h3>Check your fresh readings</h3>
            <CodeBlock lang="curl" code={`curl -I "https://omaro.xyz/igitit/api/v1/analyze?repo=facebook/react"

# X-Fresh-Readings-Remaining: 7
# X-Fresh-Readings-Reset: 1742601600`} />

            <div style={{ marginTop: "40px", padding: "24px 28px", background: "rgba(255,255,255,0.02)", border: `1px solid ${S.border}`, borderRadius: "8px" }}>
              <div style={{ fontSize: "11px", letterSpacing: "0.1em", color: S.dim, marginBottom: "12px" }}>USE CASES</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {[
                  "Journalists: programmatically audit dozens of repos in an investigation",
                  "Regulators: batch analyze all software used by regulated entities",
                  "Open source maintainers: embed transparency analysis directly in your docs",
                  "Compliance teams: integrate iGITit analysis into internal review pipelines",
                  "Researchers: build datasets of software accountability scores across industries",
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
              iGITit API v1.2 · powered by Claude · an <a href="https://omaro-pbc.org" style={{ color: S.amber, textDecoration: "none" }}>OMARO PBC</a> product
            </div>
            <a href="https://omaro.xyz" style={{ fontSize: "13px", color: S.muted, textDecoration: "none", letterSpacing: "0.04em" }}>OMARO</a>
          </div>
        </div>
      </div>
    </div>
  )
}
