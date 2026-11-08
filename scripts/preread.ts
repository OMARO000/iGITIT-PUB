// Render runs this nightly (render.yaml, igitit-prereads). The list of repositories is data/preread.json.
import { readFileSync } from "node:fs"
import { runPrereads } from "../app/lib/preread"

const urls = JSON.parse(readFileSync(new URL("../data/preread.json", import.meta.url), "utf8")).repos as string[]
runPrereads(urls)
  .then((r) => { console.log("[preread]", JSON.stringify(r)); process.exit(0) })
  .catch((e) => { console.error("[preread] failed:", e instanceof Error ? e.message : e); process.exit(1) })
