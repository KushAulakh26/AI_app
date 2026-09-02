import { pb, getPocketBaseUrl } from "./pb"
import { getAuthHeaders } from "./auth"

export type LlmContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }

export interface LlmMessage {
  role: "system" | "user" | "assistant"
  content: string | LlmContentPart[]
}

export interface LlmCallOptions {
  messages: LlmMessage[]
  page?: string
  max_tokens?: number
  temperature?: number
  signal?: AbortSignal
  request_id?: string
}

export interface LlmCallResult {
  ok: boolean
  status: "success" | "failed" | "running" | "pending" | "not_found"
  text: string
  error?: string
  model?: string
  usage?: unknown
  needsLogin?: boolean
}

export interface LlmModelInfo {
  model: string
  /** Provider-facing model identifier (e.g. openai/gpt-5.5). */
  provider_model_id: string

  max_tokens: number
  timeout_s: number
  supports_temperature: boolean
}

export const LLM_PROVIDER_NOT_CONFIGURED = "尚未配置 API 金鑰"

const CHAT_ABORT_MS = 25000
const POLL_INTERVAL_MS = 3000
const POLL_ATTEMPTS = 200

// 老代際後端兼容 (發佈刷新契約, provider_deploy 依賴 "legacyLlmRoutes" 這個標記判斷
// 本模板可以安全刷進老 app):
// 2026-07-01 aa25af8 之前的 llm.pb.js 註冊的是按模型分路由
// (/api/llm/<model>/chat|poll), 沒有扁平路由 /api/llm/chat|poll。
// 發佈刷新只換前端 lib、不動 app 已裝的 pb_hooks, 所以扁平路由 404 時自動降級
// 到按模型路由並記住結果 (同一個後端只有一種代際)。新後端永遠不會命中 404,
// 這個分支零開銷。
let legacyLlmRoutes: boolean | null = null

function llmUrl(kind: "chat" | "poll", modelName: string): string {
  const base = getPocketBaseUrl()
  return legacyLlmRoutes === true
    ? `${base}/api/llm/${encodeURIComponent(modelName)}/${kind}`
    : `${base}/api/llm/${kind}`
}

function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return "req-" + Date.now().toString(16) + "-" + Math.random().toString(16).slice(2, 10)
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...getAuthHeaders() }
  if (pb.authStore.token) headers.Authorization = pb.authStore.token
  return headers
}

async function pollOnce(modelName: string, requestId: string): Promise<LlmCallResult> {
  let res: Response
  try {
    res = await fetch(llmUrl("poll", modelName), {
      method: "POST",
      credentials: "include",
      headers: buildHeaders(),
      body: JSON.stringify({ request_id: requestId }),
    })
  } catch {
    return { ok: false, status: "running", text: "", error: "" }
  }
  if (res.status === 412) {
    return { ok: false, status: "failed", text: "", error: "login_required", needsLogin: true }
  }
  // 路由不存在 (代際不匹配/後端沒裝 llm hook) 時立刻走 3 次 not_found 快速失敗,
  // 不要按瞬時故障無限輪詢。
  if (res.status === 404) return { ok: false, status: "not_found", text: "", error: "" }
  if (!res.ok) return { ok: false, status: "running", text: "", error: "" }
  const data = await res.json().catch(() => ({}))
  return {
    ok: !!data.ok,
    status: data.status || "running",
    text: data.text || "",
    error: data.error || "",
    model: data.model,
  }
}

export async function callLlmWithFallback(modelName: string, opts: LlmCallOptions): Promise<LlmCallResult> {
  const requestId = opts.request_id || uuid()
  const payload: Record<string, unknown> = {
    model: modelName,
    messages: opts.messages,
    page: opts.page || "",
    max_tokens: opts.max_tokens,
    request_id: requestId,
  }
  if (opts.temperature !== undefined && opts.temperature !== null && !/gpt-?5/i.test(modelName)) {
    payload.temperature = opts.temperature
  }

  const ctrl = new AbortController()
  const timeoutId = window.setTimeout(() => ctrl.abort(), CHAT_ABORT_MS)
  if (opts.signal) opts.signal.addEventListener("abort", () => ctrl.abort())

  try {
    let res = await fetch(llmUrl("chat", modelName), {
      method: "POST",
      credentials: "include",
      headers: buildHeaders(),
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    })
    if (res.status === 404 && legacyLlmRoutes === null) {
      // Flat route unavailable: retry the legacy per-model route.
      legacyLlmRoutes = true
      res = await fetch(llmUrl("chat", modelName), {
        method: "POST",
        credentials: "include",
        headers: buildHeaders(),
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      })
      if (res.status === 404) {
        // 兩種代際都 404: 後端根本沒裝這個模型的 llm 路由, 快速失敗, 不進 poll。
        legacyLlmRoutes = null
        window.clearTimeout(timeoutId)
        return { ok: false, status: "failed", text: "", error: "not_found" }
      }
    }
    window.clearTimeout(timeoutId)
    if (res.status === 412) {
      return { ok: false, status: "failed", text: "", error: "login_required", needsLogin: true }
    }
    if (res.ok) {
      const data = await res.json().catch(() => ({}))
      return {
        ok: !!data.ok,
        status: data.status || "success",
        text: data.text || "",
        error: data.error || "",
        model: data.model,
        usage: data.usage,
      }
    }
  } catch {
    // network/abort error → fall through to poll loop
  } finally {
    window.clearTimeout(timeoutId)
  }

  let notFoundCount = 0
  for (let i = 0; i < POLL_ATTEMPTS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
    const r = await pollOnce(modelName, requestId)
    if (r.needsLogin) return r
    if (r.status === "success") return r
    if (r.status === "failed") return r
    if (r.status === "not_found") {
      notFoundCount++
      if (notFoundCount >= 3) return { ok: false, status: "failed", text: "", error: "not_found" }
    } else {
      notFoundCount = 0
    }
  }
  return { ok: false, status: "failed", text: "", error: "timeout" }
}

export async function listLlmModels(): Promise<LlmModelInfo[]> {
  const res = await fetch(`${getPocketBaseUrl()}/api/llm/models`, {
    method: "GET",
    credentials: "include",
    headers: buildHeaders(),
  })
  if (!res.ok) return []
  const data = (await res.json().catch(() => ({}))) as { models?: LlmModelInfo[] }
  return Array.isArray(data.models) ? data.models : []
}
