/**
 * Machine learning in a repository: fixed hints from the files read (passed to the model so it doesn't miss them),
 * and Hugging Face's public facts for any model the code loads from there (license, task, whether a model card exists).
 */
const WEIGHT_FILES = /\.(?:safetensors|gguf|ggml|onnx|pt|pth|ckpt|h5|keras|tflite|mlmodel|pb)$/i
const LIBRARIES = /\b(?:torch|pytorch|tensorflow|keras|transformers|diffusers|sentence-transformers|scikit-learn|sklearn|xgboost|lightgbm|onnxruntime|jax|flax|llama[-_]cpp|vllm|langchain|llamaindex|llama-index|openai|anthropic|@anthropic-ai\/sdk|@huggingface\/[a-z-]+|@tensorflow\/[a-z-]+|onnxruntime-web|ml5|brain\.js|cohere|mistralai|google-generativeai|@google\/generative-ai|replicate|ollama)\b/gi
const HF_LOAD = /from_pretrained\(\s*["']([\w.-]+\/[\w.-]+)["']|huggingface\.co\/([\w.-]+\/[\w.-]+)|pipeline\([^)]*model\s*=\s*["']([\w.-]+\/[\w.-]+)["']/g

export function mlHints(filePaths: string[], files: Record<string, string>): { weights: string[]; libraries: string[]; huggingFace: string[] } {
  const weights = filePaths.filter((p) => WEIGHT_FILES.test(p)).slice(0, 10)
  const libs = new Set<string>(), hf = new Set<string>()
  for (const [path, text] of Object.entries(files)) {
    if (/(?:requirements[^/]*\.txt|pyproject\.toml|setup\.py|package\.json|environment\.ya?ml|Pipfile|Cargo\.toml|go\.mod)$/i.test(path) || /\.(?:py|ts|js|ipynb)$/i.test(path)) {
      for (const m of text.matchAll(LIBRARIES)) libs.add(m[0].toLowerCase())
    }
    for (const m of text.matchAll(HF_LOAD)) { const id = m[1] ?? m[2] ?? m[3]; if (id && !/\.(?:co|com|io)$/.test(id)) hf.add(id) }
  }
  return { weights, libraries: [...libs].slice(0, 15), huggingFace: [...hf].slice(0, 5) }
}

type MlModel = { name?: string; use?: string; source?: string; huggingFace?: string; hub?: { cardPresent: boolean; license?: string; task?: string; url: string } }
type Ml = { detected?: boolean; summary?: string; models?: MlModel[]; modelCard?: unknown }

/** Adds Hugging Face's public facts to models the code loads from there. At most 3 lookups, 4 seconds each. */
export async function withHuggingFace(ml: Ml | undefined): Promise<Ml | undefined> {
  if (!ml?.models?.length) return ml
  let looked = 0
  for (const m of ml.models) {
    const id = m.huggingFace?.trim()
    if (!id || !/^[\w.-]+\/[\w.-]+$/.test(id) || looked >= 3) continue
    looked++
    try {
      const res = await fetch(`https://huggingface.co/api/models/${id}`, { signal: AbortSignal.timeout(4000) })
      if (!res.ok) { m.hub = { cardPresent: false, url: `https://huggingface.co/${id}` }; continue }
      const d = (await res.json()) as { cardData?: { license?: string }; pipeline_tag?: string; siblings?: { rfilename: string }[] }
      m.hub = { cardPresent: !!d.siblings?.some((s) => s.rfilename.toLowerCase() === "readme.md"), license: d.cardData?.license, task: d.pipeline_tag, url: `https://huggingface.co/${id}` }
    } catch { /* Hugging Face unreachable: the reading stands without it */ }
  }
  return ml
}
