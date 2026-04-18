"use client"

import { type ReactNode, useEffect, useRef, useState } from "react"

interface FemChatMessage { id: number; text: string }

interface GitByteFProps {
  files?: string[]
  outputs?: string[]
  active?: boolean
  speed?: number
  children?: ReactNode
  femChatHistory?: FemChatMessage[]
  femChatPending?: boolean
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

const W = 1100
const H = 400

export default function GitByteF({ files = DEMO_FILES, outputs, active = false, speed = 1, children, femChatHistory = [], femChatPending = false }: GitByteFProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({
    gitbyte: { x: 550, y: H / 2, w: 36, h: 28, mouthOpen: 0, eating: false, digesting: 0 },
    food: null as { x: number; y: number; text: string; eaten: boolean } | null,
    poop: null as { x: number; y: number; text: string; alpha: number; vy: number; age: number } | null,
    particles: [] as { x: number; y: number; vx: number; vy: number; alpha: number; size: number; color: string }[],
    filesEaten: 0,
    outputProduced: 0,
    frameCount: 0,
    bobOffset: 0,
    bobDir: 1,
    tailWag: 0,
    blinkTimer: 0,
    fileIndex: 0,
    autoFeedTimer: 0,
    fileList: files,
    outputList: outputs ?? DEMO_OUTPUTS,
    speed,
  })
  const [statusText, setStatusText] = useState("")
  const [score, setScore] = useState({ eaten: 0, produced: 0 })
  const [mounted, setMounted] = useState(false)
  const rafRef = useRef<number | undefined>(undefined)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    stateRef.current.fileList = files && files.length > 0 ? files : DEMO_FILES
    stateRef.current.outputList = outputs && outputs.length > 0 ? outputs : DEMO_OUTPUTS
    stateRef.current.speed = speed
  }, [files, outputs, speed])

  useEffect(() => {
    if (!mounted) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const spawnFood = (text: string) => {
      const s = stateRef.current
      s.food = { x: W + 20, y: H / 2, text, eaten: false }
      setStatusText("eating " + text + "…")
    }

    const spawnPoop = (text: string) => {
      const s = stateRef.current
      s.poop = { x: s.gitbyte.x, y: s.gitbyte.y + s.gitbyte.h / 2 + 4, text, alpha: 1, vy: 1.4, age: 0 }
      s.outputProduced++
      setScore({ eaten: s.filesEaten, produced: s.outputProduced })
    }

    const spawnParticles = (x: number, y: number) => {
      const s = stateRef.current
      for (let i = 0; i < 8; i++) {
        s.particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          alpha: 1, size: Math.random() * 2.5 + 1,
          color: Math.random() > 0.5 ? "#4A9EF0" : "#4CAF7D",
        })
      }
    }

    const drawGrid = () => {
      ctx.strokeStyle = "rgba(255,255,255,0.03)"
      ctx.lineWidth = 0.5
      for (let x = 0; x <= W; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
      for (let y = 0; y <= H; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }
    }

    const drawGitbyte = () => {
      const s = stateRef.current
      const gx = s.gitbyte.x
      const gy = s.gitbyte.y + s.bobOffset
      const gw = s.gitbyte.w
      const gh = s.gitbyte.h

      // Tail
      const wagX = gx - gw / 2 - 8 + Math.sin(s.tailWag) * 4
      const wagY = gy + Math.cos(s.tailWag) * 2
      ctx.fillStyle = "#378ADD"
      ctx.beginPath()
      ctx.moveTo(gx - gw / 2, gy - 3)
      ctx.lineTo(wagX, wagY - 4)
      ctx.lineTo(wagX - 4, wagY + 2)
      ctx.lineTo(gx - gw / 2, gy + 3)
      ctx.closePath()
      ctx.fill()

      // Body
      ctx.fillStyle = "#4A9EF0"
      ctx.beginPath()
      ctx.roundRect(gx - gw / 2, gy - gh / 2, gw, gh, 6)
      ctx.fill()

      // Belly
      ctx.fillStyle = "rgba(255,255,255,0.12)"
      ctx.beginPath()
      ctx.roundRect(gx - gw / 2 + 4, gy + 2, gw - 8, gh / 2 - 6, 3)
      ctx.fill()

      // Legs
      const legBob = s.gitbyte.eating ? Math.sin(Date.now() / 80) * 2 : 0
      ctx.fillStyle = "#378ADD"
      ctx.fillRect(gx - 10, gy + gh / 2 - 2, 6, 6 + legBob)
      ctx.fillRect(gx + 4, gy + gh / 2 - 2, 6, 6 - legBob)

      // Eye
      ctx.fillStyle = "#0b0b0c"
      ctx.beginPath(); ctx.arc(gx + gw / 2 - 8, gy - 4, 4, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = "white"
      ctx.beginPath(); ctx.arc(gx + gw / 2 - 7, gy - 5, 1.5, 0, Math.PI * 2); ctx.fill()

      // Blink
      if (s.blinkTimer > 0 && s.blinkTimer < 5) {
        ctx.fillStyle = "#4A9EF0"
        ctx.fillRect(gx + gw / 2 - 12, gy - 8, 9, 5)
      }

      // Digesting glow
      if (s.gitbyte.digesting > 0) {
        ctx.fillStyle = `rgba(76,175,125,${(s.gitbyte.digesting / 50) * 0.2})`
        ctx.beginPath()
        ctx.roundRect(gx - gw / 2 - 4, gy - gh / 2 - 4, gw + 8, gh + 8, 10)
        ctx.fill()
      }

      // Mouth
      const ms = s.gitbyte.mouthOpen * 9
      if (ms > 1) {
        ctx.fillStyle = "#0b0b0c"
        ctx.beginPath(); ctx.arc(gx + gw / 2, gy + 3, ms, 0, Math.PI); ctx.fill()
        ctx.fillStyle = "white"
        ctx.fillRect(gx + gw / 2 - 5, gy + 3, 3, ms * 0.5)
        ctx.fillRect(gx + gw / 2 + 1, gy + 3, 3, ms * 0.5)
      } else {
        ctx.strokeStyle = "#0b0b0c"; ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.arc(gx + gw / 2, gy + 2, 3, 0, Math.PI); ctx.stroke()
      }

      // ── FLOWER (distinguishing feature — same blue family, pixel art) ──
      const fx = gx + gw / 2 - 10
      const fy = gy - gh / 2 - 9
      // 5 petals, solid blue (visible on both dark and light backgrounds)
      ctx.fillStyle = "rgba(220,80,120,1.0)"
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 - Math.PI / 2
        ctx.beginPath()
        ctx.ellipse(fx + Math.cos(angle) * 5.5, fy + Math.sin(angle) * 5.5, 3.5, 2.4, angle, 0, Math.PI * 2)
        ctx.fill()
      }
      // Outer ring of center
      ctx.fillStyle = "rgba(255,255,255,1.0)"
      ctx.beginPath(); ctx.arc(fx, fy, 3.2, 0, Math.PI * 2); ctx.fill()
      // Inner dot
      ctx.fillStyle = "#4A9EF0"
      ctx.beginPath(); ctx.arc(fx, fy, 1.6, 0, Math.PI * 2); ctx.fill()
    }

    const drawFood = () => {
      const s = stateRef.current
      if (!s.food || s.food.eaten) return
      ctx.font = "12px 'IBM Plex Mono', monospace"
      const tw = ctx.measureText(s.food.text).width + 20
      const bx = s.food.x - tw
      const by = s.food.y - 13
      ctx.fillStyle = "rgba(255,255,255,0.06)"
      ctx.beginPath(); ctx.roundRect(bx, by, tw, 22, 4); ctx.fill()
      ctx.strokeStyle = "rgba(74,158,240,0.4)"; ctx.lineWidth = 0.5; ctx.stroke()
      ctx.fillStyle = "#4A9EF0"
      ctx.fillText(s.food.text, bx + 8, s.food.y + 2)
    }

    const drawPoop = () => {
      const s = stateRef.current
      if (!s.poop) return
      ctx.globalAlpha = s.poop.alpha
      ctx.font = "12px 'IBM Plex Mono', monospace"
      const tw = ctx.measureText(s.poop.text).width + 20
      const bx = Math.max(8, Math.min(W - tw - 8, s.poop.x - tw / 2))
      const by = s.poop.y - 13
      ctx.fillStyle = "rgba(255,255,255,0.06)"
      ctx.beginPath(); ctx.roundRect(bx, by, tw, 22, 4); ctx.fill()
      ctx.strokeStyle = "rgba(76,175,125,0.45)"; ctx.lineWidth = 0.5; ctx.stroke()
      ctx.fillStyle = "#4CAF7D"
      ctx.fillText(s.poop.text, bx + 8, s.poop.y + 2)
      ctx.fillStyle = "rgba(76,175,125,0.4)"
      for (let i = 0; i < 3; i++) {
        ctx.beginPath()
        ctx.arc(bx + tw / 2 - 8 + i * 8, s.poop.y + 14 + Math.sin(s.poop.age / 8 + i) * 2, 2, 0, Math.PI * 2)
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

    const drawLabel = () => {
      ctx.font = "15px 'IBM Plex Mono', monospace"
      ctx.fillStyle = "rgba(255,255,255,0.08)"
      ctx.fillText("fem gitbyte", 10, 24)
      // Teal dot to signal interactive mode
      ctx.fillStyle = "rgba(0,200,150,0.7)"
      ctx.beginPath(); ctx.arc(110, 17, 4, 0, Math.PI * 2); ctx.fill()
    }

    const loop = () => {
      ctx.clearRect(0, 0, W, H)
      drawGrid()

      const s = stateRef.current
      s.frameCount++
      s.bobOffset += s.bobDir * 0.1
      if (Math.abs(s.bobOffset) > 2) s.bobDir *= -1
      s.tailWag += 0.07
      s.blinkTimer = (s.blinkTimer + 1) % 200

      if (s.food && !s.food.eaten) {
        s.gitbyte.mouthOpen = Math.min(1, s.gitbyte.mouthOpen + 0.1)
        s.gitbyte.eating = true
      } else {
        s.gitbyte.mouthOpen = Math.max(0, s.gitbyte.mouthOpen - 0.06)
        s.gitbyte.eating = false
      }

      if (s.food && !s.food.eaten) {
        s.food.x -= 2.5 * s.speed
        ctx.font = "12px 'IBM Plex Mono', monospace"
        const eatX = s.gitbyte.x + s.gitbyte.w / 2
        const foodLeft = s.food.x - (ctx.measureText(s.food.text).width + 20)
        if (foodLeft < eatX) {
          const fn = s.food.text
          s.food.eaten = true
          s.filesEaten++
          s.gitbyte.digesting = 50
          spawnParticles(eatX, s.gitbyte.y)
          const idx = s.fileList.indexOf(fn)
          const outText = idx >= 0 && s.outputList[idx]
            ? s.outputList[idx]
            : s.outputList[s.filesEaten % s.outputList.length] ?? "processes data"
          s.food = null
          setTimeout(() => {
            spawnPoop(outText)
            setStatusText("→ \"" + outText + "\"")
          }, 400)
        }
      }

      // Only auto-feed when explicitly active
      if (active) {
        s.autoFeedTimer++
        if (s.autoFeedTimer > Math.floor(80 / s.speed) && !s.food) {
          s.autoFeedTimer = 0
          spawnFood(s.fileList[s.fileIndex % s.fileList.length])
          s.fileIndex++
        }
      }

      if (s.gitbyte.digesting > 0) s.gitbyte.digesting--

      if (s.poop) {
        s.poop.y += s.poop.vy
        s.poop.age++
        if (s.poop.age > 70) s.poop.alpha -= 0.02
        if (s.poop.alpha <= 0) s.poop = null
      }

      s.particles = s.particles.filter(p => p.alpha > 0)
      s.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.alpha -= 0.04; p.vx *= 0.9; p.vy *= 0.9 })

      drawParticles()
      drawFood()
      drawPoop()
      drawGitbyte()
      drawLabel()

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    // Only spawn initial food if actively feeding
    if (active) {
      setTimeout(() => spawnFood(stateRef.current.fileList[0] ?? "auth.ts"), 800)
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [active, mounted])

  if (!mounted) return null

  const handleFeed = () => {
    const s = stateRef.current
    if (s.food && !s.food.eaten) return
    const fn = s.fileList[s.fileIndex % s.fileList.length]
    s.fileIndex++
    s.food = { x: W + 20, y: H / 2, text: fn, eaten: false }
    setStatusText("eating " + fn + "…")
  }

  return (
    <div className="fem-gitbyte-box" style={{ marginTop: "32px", border: "1px solid rgba(0,200,150,0.25)", borderRadius: "8px", overflow: "hidden", background: "rgba(0,200,150,0.03)" }}>
      <div style={{ padding: "10px 20px", borderBottom: "1px solid rgba(0,200,150,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "11px", color: "rgba(0,200,150,0.6)", letterSpacing: "0.1em", fontFamily: "'IBM Plex Mono', monospace" }}>
          FEM GITBYTE · post-analysis guide
        </div>
        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.15)", letterSpacing: "0.06em", fontFamily: "'IBM Plex Mono', monospace" }}>
          files eaten: {score.eaten} · plain language produced: {score.produced}
        </div>
      </div>
      <div style={{ position: "relative" }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{ display: "block", width: "100%", height: `${H}px`, cursor: "pointer" }}
          onClick={handleFeed}
        />
        {/* FEM GITBYTE multi-turn bubble stack — newest at bottom, older messages faded above */}
        {(femChatPending || femChatHistory.length > 0) && (
          <div style={{
            position: "absolute",
            bottom: "245px",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            gap: "5px",
            maxWidth: "68%",
            alignItems: "center",
            pointerEvents: "none",
            width: "68%",
          }}>
            {/* Oldest messages first (top), newest last (bottom) */}
            {femChatHistory.map((msg, i) => {
              const total = femChatHistory.length
              const posFromNewest = total - 1 - i // 0 = newest
              const opacity = posFromNewest === 0 ? 1 : posFromNewest === 1 ? 0.55 : 0.28
              const fontSize = posFromNewest === 0 ? "12px" : "11px"
              return (
                <div key={msg.id} className="fem-chat-bubble" style={{
                  background: "rgba(0,0,0,0.55)",
                  border: `1px solid rgba(0,200,150,${posFromNewest === 0 ? "0.5" : "0.25"})`,
                  borderRadius: "5px",
                  padding: "8px 16px",
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize,
                  color: `rgba(0,200,150,${opacity})`,
                  textAlign: "center",
                  lineHeight: 1.6,
                  letterSpacing: "0.03em",
                  boxShadow: posFromNewest === 0 ? "0 0 18px rgba(0,200,150,0.12)" : "none",
                  width: "100%",
                  transition: "opacity 0.4s ease",
                  maxHeight: "300px",
                  overflowY: "auto",
                }}>
                  {msg.text}
                </div>
              )
            })}
            {/* Pending "..." indicator */}
            {femChatPending && (
              <div style={{
                background: "rgba(0,0,0,0.45)",
                border: "1px solid rgba(0,200,150,0.3)",
                borderRadius: "5px",
                padding: "8px 20px",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "14px",
                color: "rgba(0,200,150,0.7)",
                letterSpacing: "0.15em",
                animation: "pulse 0.6s ease-in-out infinite",
              }}>
                ...
              </div>
            )}
          </div>
        )}
      </div>
      <div style={{ padding: "10px 20px", borderTop: "1px solid rgba(0,200,150,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div suppressHydrationWarning style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)", letterSpacing: "0.04em", fontFamily: "'IBM Plex Mono', monospace", fontStyle: "italic" }}>
          {statusText || (active ? "" : "click canvas to feed · or ask a question below")}
        </div>
        <button onClick={handleFeed} style={{ background: "rgba(0,200,150,0.1)", border: "1px solid rgba(0,200,150,0.4)", borderRadius: "4px", padding: "7px 18px", fontFamily: "'IBM Plex Mono', monospace", fontSize: "16px", color: "#00C896", cursor: "pointer", letterSpacing: "0.06em", minWidth: "160px", textAlign: "center" }}>
          [ feed gitbyte ]
        </button>
      </div>
      {/* Children: embedded interactive content (e.g. ask-about-this-repo input) */}
      {children && (
        <div style={{ borderTop: "1px solid rgba(0,200,150,0.12)", padding: "16px 20px", background: "rgba(0,200,150,0.02)" }}>
          {children}
        </div>
      )}
    </div>
  )
}
