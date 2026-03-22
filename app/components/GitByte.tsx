"use client"

import { useEffect, useRef, useState } from "react"

interface GitByteProps {
  files?: string[]  // real filenames from the repo being analyzed
  active?: boolean  // true during loading screens
}

const DEMO_FILES = [
  "auth.ts", "schema.sql", "middleware.ts", "db.ts", "package.json",
  "next.config.js", "index.tsx", "utils.ts", "api/route.ts", "lib/stripe.ts",
  "README.md", "schema.ts", "components/nav.tsx", "hooks/useAuth.ts", ".env.example",
]

const DEMO_OUTPUTS = [
  "checks if you're logged in", "stores your data", "validates requests",
  "connects to database", "lists dependencies", "configures the app",
  "renders the page", "helper functions", "handles payments", "processes the API",
  "explains the project", "defines data shapes", "navigation bar", "login hook", "example secrets",
]

export default function GitByte({ files = DEMO_FILES, active = false }: GitByteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({
    gitbyte: { x: 320, y: 120, w: 36, h: 28, mouthOpen: 0, eating: false, digesting: 0 },
    food: null as { x: number; y: number; text: string; eaten: boolean } | null,
    poop: null as { x: number; y: number; text: string; alpha: number; vy: number; age: number } | null,
    particles: [] as { x: number; y: number; vx: number; vy: number; alpha: number; size: number; color: string }[],
    filesEaten: 0,
    outputProduced: 0,
    statusText: "idle — feed me a file",
    frameCount: 0,
    bobOffset: 0,
    bobDir: 1,
    tailWag: 0,
    blinkTimer: 0,
    fileIndex: 0,
    autoFeedTimer: 0,
    fileList: files,
    outputList: DEMO_OUTPUTS,
  })
  const [statusText, setStatusText] = useState("idle — feed me a file")
  const [score, setScore] = useState({ eaten: 0, produced: 0 })
  const rafRef = useRef<number>()

  useEffect(() => {
    stateRef.current.fileList = files.length > 0 ? files : DEMO_FILES
  }, [files])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const W = 1280, H = 480
    canvas.width = W
    canvas.height = H
    ctx.scale(2, 2)
    const DW = 640, DH = 240

    const spawnFood = (filename: string) => {
      const s = stateRef.current
      s.food = { x: DW - 10, y: 120, text: filename, eaten: false }
      s.statusText = "eating " + filename + "…"
      setStatusText("eating " + filename + "…")
    }

    const spawnPoop = (text: string) => {
      const s = stateRef.current
      s.poop = { x: s.gitbyte.x - 40, y: s.gitbyte.y + 8, text, alpha: 1, vy: -0.3, age: 0 }
      s.outputProduced++
      setScore({ eaten: s.filesEaten, produced: s.outputProduced })
    }

    const spawnParticles = (x: number, y: number) => {
      const s = stateRef.current
      for (let i = 0; i < 10; i++) {
        s.particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 5,
          vy: (Math.random() - 0.5) * 5,
          alpha: 1,
          size: Math.random() * 3 + 1,
          color: Math.random() > 0.5 ? "#4A9EF0" : "#4CAF7D",
        })
      }
    }

    const drawGrid = () => {
      ctx.strokeStyle = "rgba(255,255,255,0.025)"
      ctx.lineWidth = 0.5
      for (let x = 0; x < DW; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, DH); ctx.stroke() }
      for (let y = 0; y < DH; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(DW, y); ctx.stroke() }
    }

    const drawGitbyte = () => {
      const s = stateRef.current
      const gx = s.gitbyte.x
      const gy = s.gitbyte.y + s.bobOffset
      const gw = s.gitbyte.w, gh = s.gitbyte.h

      // Body
      ctx.fillStyle = "#4A9EF0"
      ctx.beginPath();
      (ctx as CanvasRenderingContext2D & { roundRect: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect(gx - gw/2, gy - gh/2, gw, gh, 6)
      ctx.fill()

      // Belly
      ctx.fillStyle = "rgba(255,255,255,0.12)"
      ctx.beginPath();
      (ctx as CanvasRenderingContext2D & { roundRect: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect(gx - gw/2 + 4, gy + 2, gw - 8, gh/2 - 6, 3)
      ctx.fill()

      // Tail
      const wagX = gx - gw/2 - 10 + Math.sin(s.tailWag) * 5
      const wagY = gy + Math.cos(s.tailWag) * 3
      ctx.fillStyle = "#378ADD"
      ctx.beginPath()
      ctx.moveTo(gx - gw/2, gy - 4)
      ctx.lineTo(wagX, wagY - 5)
      ctx.lineTo(wagX - 4, wagY + 2)
      ctx.lineTo(gx - gw/2, gy + 4)
      ctx.fill()

      // Legs
      const legBob = s.gitbyte.eating ? Math.sin(Date.now() / 80) * 3 : 0
      ctx.fillStyle = "#378ADD"
      ctx.fillRect(gx - 10, gy + gh/2 - 2, 7, 7 + legBob)
      ctx.fillRect(gx + 4, gy + gh/2 - 2, 7, 7 - legBob)

      // Eye
      ctx.fillStyle = "#0b0b0c"
      ctx.beginPath(); ctx.arc(gx + gw/2 - 8, gy - 4, 4.5, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = "white"
      ctx.beginPath(); ctx.arc(gx + gw/2 - 7, gy - 5, 1.5, 0, Math.PI * 2); ctx.fill()

      // Blink
      if (s.blinkTimer > 0 && s.blinkTimer < 5) {
        ctx.fillStyle = "#4A9EF0"
        ctx.fillRect(gx + gw/2 - 13, gy - 9, 10, 6)
      }

      // Digesting glow
      if (s.gitbyte.digesting > 0) {
        ctx.fillStyle = "rgba(76,175,125," + (s.gitbyte.digesting / 40 * 0.25) + ")"
        ctx.beginPath();
        (ctx as CanvasRenderingContext2D & { roundRect: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect(gx - gw/2 - 4, gy - gh/2 - 4, gw + 8, gh + 8, 10)
        ctx.fill()
      }

      // Mouth
      const mouthSize = s.gitbyte.mouthOpen * 10
      if (mouthSize > 1) {
        ctx.fillStyle = "#0b0b0c"
        ctx.beginPath(); ctx.arc(gx + gw/2, gy + 4, mouthSize, 0, Math.PI); ctx.fill()
        ctx.fillStyle = "white"
        ctx.fillRect(gx + gw/2 - 6, gy + 4, 4, mouthSize * 0.5)
        ctx.fillRect(gx + gw/2 + 1, gy + 4, 4, mouthSize * 0.5)
      } else {
        ctx.strokeStyle = "#0b0b0c"; ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.arc(gx + gw/2, gy + 3, 3.5, 0, Math.PI); ctx.stroke()
      }
    }

    const drawFood = () => {
      const s = stateRef.current
      if (!s.food || s.food.eaten) return
      const px = s.food.x, py = s.food.y
      ctx.font = "14px 'IBM Plex Mono', monospace"
      const tw = ctx.measureText(s.food.text).width + 24
      ctx.fillStyle = "rgba(255,255,255,0.06)"
      ctx.beginPath()
      ctx.roundRect(px - tw, py - 16, tw, 26, 4)
      ctx.fill()
      ctx.strokeStyle = "rgba(74,158,240,0.35)"; ctx.lineWidth = 0.5; ctx.stroke()
      ctx.fillStyle = "#4A9EF0"
      ctx.fillText(s.food.text, px - tw + 10, py + 3)
    }

    const drawPoop = () => {
      const s = stateRef.current
      if (!s.poop) return
      ctx.globalAlpha = s.poop.alpha
      ctx.font = "13px 'IBM Plex Mono', monospace"
      const tw = ctx.measureText(s.poop.text).width + 24
      ctx.fillStyle = "rgba(255,255,255,0.06)"
      ctx.beginPath()
      ctx.roundRect(s.poop.x - tw, s.poop.y - 16, tw, 26, 4)
      ctx.fill()
      ctx.strokeStyle = "rgba(76,175,125,0.4)"; ctx.lineWidth = 0.5; ctx.stroke()
      ctx.fillStyle = "#4CAF7D"
      ctx.fillText(s.poop.text, s.poop.x - tw + 10, s.poop.y + 3)
      // drip dots
      ctx.fillStyle = "rgba(76,175,125,0.35)"
      for (let i = 0; i < 3; i++) {
        ctx.beginPath()
        ctx.arc(s.poop.x - tw/2 - 6 + i * 8, s.poop.y + 16 + Math.sin(s.poop.age / 10 + i) * 2, 2, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    const drawParticles = () => {
      const s = stateRef.current
      s.particles.forEach(p => {
        ctx.globalAlpha = p.alpha
        ctx.fillStyle = p.color
        ctx.fillRect(p.x, p.y, p.size, p.size)
      })
      ctx.globalAlpha = 1
    }

    // Label
    const drawLabel = () => {
      ctx.fillStyle = "rgba(255,255,255,0.08)"
      ctx.font = "15px 'IBM Plex Mono', monospace"
      ctx.fillText("gitbyte", 10, 22)
      ctx.fillStyle = "#4A9EF0"
      ctx.beginPath(); ctx.arc(88, 16, 4, 0, Math.PI * 2); ctx.fill()
    }

    const loop = () => {
      ctx.clearRect(0, 0, DW, DH)
      drawGrid()
      const s = stateRef.current
      s.frameCount++

      // Bob
      s.bobOffset += s.bobDir * 0.12
      if (Math.abs(s.bobOffset) > 2) s.bobDir *= -1

      // Tail wag
      s.tailWag += 0.07

      // Blink
      s.blinkTimer = (s.blinkTimer + 1) % 200

      // Mouth
      if (s.food && !s.food.eaten) {
        s.gitbyte.mouthOpen = Math.min(1, s.gitbyte.mouthOpen + 0.1)
        s.gitbyte.eating = true
      } else {
        s.gitbyte.mouthOpen = Math.max(0, s.gitbyte.mouthOpen - 0.06)
        s.gitbyte.eating = false
      }

      // Move food
      if (s.food && !s.food.eaten) {
        s.food.x -= 2.2
        const eatX = s.gitbyte.x + s.gitbyte.w / 2
        if (s.food.x < eatX) {
          const fn = s.food.text
          s.food.eaten = true
          s.filesEaten++
          s.gitbyte.digesting = 50
          spawnParticles(eatX, s.gitbyte.y)
          const idx = s.fileList.indexOf(fn)
          const outText = idx >= 0 && s.outputList[idx] ? s.outputList[idx] : "processes data"
          setTimeout(() => {
            spawnPoop(outText)
            s.statusText = "→ \"" + outText + "\""
            setStatusText("→ \"" + outText + "\"")
          }, 500)
          s.food = null
        }
      }

      // Auto-feed during active loading
      if (active) {
        s.autoFeedTimer++
        if (s.autoFeedTimer > 90 && !s.food) {
          s.autoFeedTimer = 0
          const fn = s.fileList[s.fileIndex % s.fileList.length]
          s.fileIndex++
          spawnFood(fn)
        }
      }

      // Digesting
      if (s.gitbyte.digesting > 0) s.gitbyte.digesting--

      // Poop
      if (s.poop) {
        s.poop.y += s.poop.vy; s.poop.age++
        if (s.poop.age > 80) s.poop.alpha -= 0.018
        if (s.poop.alpha <= 0) s.poop = null
      }

      // Particles
      s.particles = s.particles.filter(p => p.alpha > 0)
      s.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.alpha -= 0.035; p.vx *= 0.92; p.vy *= 0.92 })

      drawParticles()
      drawFood()
      drawPoop()
      drawGitbyte()
      drawLabel()

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    // Initial demo feed
    setTimeout(() => spawnFood(stateRef.current.fileList[0] ?? "auth.ts"), 1000)

    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [active])

  const handleFeed = () => {
    const s = stateRef.current
    if (s.food && !s.food.eaten) return
    const fn = s.fileList[s.fileIndex % s.fileList.length]
    s.fileIndex++
    s.food = { x: 630, y: 120, text: fn, eaten: false }
    s.statusText = "eating " + fn + "…"
    setStatusText("eating " + fn + "…")
  }

  return (
    <div style={{
      marginTop: "32px",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: "8px",
      overflow: "hidden",
      background: "rgba(255,255,255,0.01)",
    }}>
      {/* Header */}
      <div style={{
        padding: "10px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", fontFamily: "'IBM Plex Mono', monospace" }}>
          GITBYTE · open source, open language
        </div>
        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.15)", letterSpacing: "0.06em", fontFamily: "'IBM Plex Mono', monospace" }}>
          files eaten: {score.eaten} · plain language produced: {score.produced}
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={1280}
        height={480}
        style={{ display: "block", width: "100%", height: "240px", cursor: "pointer" }}
        onClick={handleFeed}
      />

      {/* Footer */}
      <div style={{
        padding: "10px 20px",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)", letterSpacing: "0.04em", fontFamily: "'IBM Plex Mono', monospace", fontStyle: "italic" }}>
          {statusText}
        </div>
        <button
          onClick={handleFeed}
          style={{
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "4px",
            padding: "5px 14px",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "12px",
            color: "rgba(255,255,255,0.35)",
            cursor: "pointer",
            letterSpacing: "0.06em",
          }}
        >
          [ feed gitbyte ]
        </button>
      </div>
    </div>
  )
}
