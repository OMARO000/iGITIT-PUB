/**
 * Where this server is reached from outside. Until omaro.xyz is live, that's the Render address; then set
 * NEXT_PUBLIC_ORIGIN=https://omaro.xyz in Render (it's read when the app is built) and every link follows.
 */
export const ORIGIN = (process.env.NEXT_PUBLIC_ORIGIN || "https://igitit-4bty.onrender.com").replace(/\/$/, "")
/** The path every page and API lives under (next.config.ts basePath). */
export const BASE_PATH = "/iris/code"
export const BASE = `${ORIGIN}${BASE_PATH}`
