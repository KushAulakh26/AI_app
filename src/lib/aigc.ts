import { pb, getPocketBaseUrl } from "./pb"
import { getAuthHeaders } from "./auth"

export async function fileToDataUrl(f: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(f)
  })
}

export interface AigcOutput {
  url: string
  type: "image" | "video" | "audio" | "3d" | "file"
}

export interface AigcSubmitResponse {
  ok: boolean
  taskId: string
  upstreamTaskId?: string
  status?: "running" | "queued" | "success" | "failed"
  model?: string
  error?: string
  errorCode?: string
  message?: string
}

// 兼容早期 scaffold 版 aigc.ts 的響應包絡類型 (callAigc<AigcResponse<X>> 形式的存量頁面代碼)。
// 新代碼不需要它: 標準模型直接用 AigcSubmitResponse / callAigcAndPoll, AI 應用用 AiAppRunResponse。
export interface AigcResponse<T = unknown> {
  taskId: string
  task_id?: string
  upstreamTaskId?: string
  results: T[]
  outputs: AigcOutput[]
}

export interface AigcPollResponse {
  ok: boolean
  taskId: string
  status: "RUNNING" | "QUEUED" | "SUCCESS" | "FAILED" | "CANCEL"
  outputs?: AigcOutput[]
  model?: string
  error?: string
  message?: string
  usage?: AigcUsage
}

// 真實扣費明細, 來自 /openapi/v2/query 終態響應的 usage 字段 (只在 SUCCESS/FAILED 等終態出現)。
// thirdPartyConsumeMoney 通常是實付金額; consumeMoney/consumeCoins 常爲 null。全部按字符串處理,
// 避免浮點精度問題 —— 展示時直接拼 "¥" + thirdPartyConsumeMoney, 不要 parseFloat 再格式化。
export interface AigcUsage {
  consumeMoney: string | null
  consumeCoins: string | null
  taskCostTime: string | null
  thirdPartyConsumeMoney: string | null
}

// 價格預估響應。標準模型 endpoint 有真實單價, 通常 ok:true; AI 應用沒有固定單價, price-preview
// 端點未必覆蓋, 失敗一律 ok:false —— 調用方應隱藏價格徽標而不是報錯阻塞生成按鈕。
export interface AigcPricePreview {
  ok: boolean
  estimatedPrice?: number
  currency?: string
  priceText?: string
  freeLimit?: boolean
  isFreeThisCall?: boolean
  message?: string
}

// 標量參數契約 (來自 aigc_models_index.json, 經 GET /api/aigc/models 透出)。enum 存在時必須渲染成
// select/segmented 控件且用 default 預選; required=true 的參數不允許隱藏或寫死常量。
export interface AigcScalarParam {
  name: string
  type?: "string" | "bool" | "number"
  required?: boolean
  enum?: string[]
  default?: string | number | boolean
}

// 媒體輸入契約。multiple=true 必須用 uploadAigcMediaFiles 支持多圖/多文件上傳 (上限 max_num),
// 不能只做單圖 uploadAigcMedia —— 圖生圖/圖編輯類模型的 imageUrls 常見 max_num 5~10。
export interface AigcMediaParam {
  name: string
  type?: "image" | "video" | "audio" | "zip"
  required?: boolean
  multiple?: boolean
  max_num?: number
  accept?: string
  max_size?: number
}

export interface AigcModelInfo {
  model: string
  endpoint: string
  output_type: "image" | "video" | "audio" | "3d" | "file"
  primary_input?: { name: string; required?: boolean } | null
  scalar_params?: AigcScalarParam[]
  media_params?: AigcMediaParam[]
}

export interface AigcSuccess {
  status: "success"
  taskId: string
  upstreamTaskId?: string
  outputs: AigcOutput[]
  url: string
  model?: string
  // 真實扣費明細 (來自 usage), 結果詳情面板默認展示 taskId + usage.thirdPartyConsumeMoney。
  usage?: AigcUsage
}

export interface AigcFailure {
  status: "failed"
  taskId?: string
  error: string
  /**
   * errorKind 是穩定的英文枚舉, 頁面層按這個分支顯示中文文案:
   * - submit:         提交任務失敗 (網絡/服務器繁忙)
   * - poll:           輪詢任務狀態失敗 (臨時上游錯)
   * - timeout:        超過 deadline 仍沒出結果
   * - aborted:        被 AbortSignal 取消
   * - login_required: 412 / 401 SANDBOX_TOKEN_REQUIRED 等, 引導用戶登錄 AI provider
   * - insufficient_balance: 賬戶餘額不足, 重試不解決, 引導充值
   * - content_audit:  內容審覈未通過 (內容安全規則攔截), 重試同 prompt 也救不回, 讓用戶換措辭
   * - task_failed:    其他業務失敗 (上游模型推理失敗 / 參數無效等)
   */
  errorKind:
    | "submit"
    | "poll"
    | "timeout"
    | "aborted"
    | "login_required"
    | "insufficient_balance"
    | "content_audit"
    | "task_failed"
  needsLogin?: boolean
  usage?: AigcUsage
}

export type AigcResult = AigcSuccess | AigcFailure

const LOGIN_REQUIRED_ZH = "請先登錄 AI provider 後再生成"

const AIGC_ERROR_MESSAGES_ZH: Record<AigcFailure["errorKind"], string> = {
  submit: "提交生成任務失敗 (網絡或服務器繁忙), 請稍後重試",
  poll: "查詢生成結果失敗, 請稍後重試",
  timeout: "AI 生成超時 (可能服務器繁忙), 請稍後重試",
  aborted: "已取消",
  login_required: LOGIN_REQUIRED_ZH,
  insufficient_balance: "AI provider 賬戶餘額不足, 請充值後重試",
  content_audit: "內容審覈未通過",
  task_failed: "生成失敗, 請稍後重試或換個 prompt",
}

// callAigcAndPoll 在沒有真實上游文案時會把 error 設成這些內部佔位字符串 (見本文件 poll 循環),
// 拼進 base 文案只會重複自己, 應該跳過。
const AIGC_ERROR_PLACEHOLDER_VALUES = new Set([
  "aborted",
  "submit failed",
  "poll timeout",
  "task_failed",
  "login_required",
  "login_required",
])

function authFailureHaystack(...parts: unknown[]): string {
  return parts
    .map((part) => {
      if (part == null) return ""
      if (typeof part === "string") return part
      try {
        return JSON.stringify(part)
      } catch {
        return String(part)
      }
    })
    .join(" ")
    .toLowerCase()
}

// 發佈沙箱未登錄 → control 401 {detail:{code:"SANDBOX_TOKEN_REQUIRED"}};
// key/登錄態失效 → hook 412 login_required。兩者都要引導登錄, 不能落成"網絡繁忙"。
function isLoginRequiredSignal(status: number, ...parts: unknown[]): boolean {
  if (status === 412 || status === 401) return true
  const hay = authFailureHaystack(...parts)
  return (
    hay.includes("sandbox_token_required") ||
    hay.includes("sandbox_api_key_missing") ||
    hay.includes("login_required") ||
    hay.includes("login_required") ||
    hay.includes("登錄態已過期") ||
    hay.includes("請先登錄")
  )
}

function loginRequiredFailure(opts?: { taskId?: string; error?: string }): AigcFailure {
  return {
    status: "failed",
    taskId: opts?.taskId,
    errorKind: "login_required",
    error: opts?.error || "login_required",
    needsLogin: true,
  }
}

// AigcFailure → 中文詳情的默認安全格式化。對**所有** errorKind (不只 content_audit /
// insufficient_balance) 都會把 AI provider 返回的真實原因拼在中文文案後面, 除非它是內部佔位符
// 或者跟本地化文案完全一樣。頁面 hook 處理失敗分支時應該直接調用這個函數, 不要自己寫一份
// errorKind 白名單去挑着拼 result.error —— 白名單漏掉的分支 (最常見就是 task_failed) 會把
// AI provider 的真實報錯吞掉, 只剩一句通用文案, 用戶看不出實際失敗原因 (比如 "音頻時長過短")。
// login_required 只展示引導文案, 不拼 SANDBOX_TOKEN_REQUIRED 之類的技術碼。
export function formatAigcFailureMessage(result: AigcFailure): string {
  const base = AIGC_ERROR_MESSAGES_ZH[result.errorKind] || "生成失敗, 請重試"
  if (result.errorKind === "login_required") return base
  const raw = result.error
  if (raw && !AIGC_ERROR_PLACEHOLDER_VALUES.has(raw) && raw !== base) {
    return `${base}: ${raw}`
  }
  return base
}

// 一條歷史任務 (來自 pb_hooks 的 /api/aigc/history, 按當前 用戶過濾).
export interface AigcHistoryItem {
  jobId: string
  taskId: string
  status: string // running | success | failed
  page: string
  prompt: string
  resultUrl: string // 成功任務的 CDN URL, 失敗/進行中爲空串
  errorMessage: string
  rating: number
  favorite: boolean
  category: string
  note: string
  created: string
  updated: string
  // 提交時用的 模型短名 (resumeAigcJob 恢復輪詢時用它判斷視頻/音頻類模型要用 30 分鐘 deadline)。
  model: string
  // 真實扣費明細 (落庫快照, 由 /jobs/<id>/poll 拿到終態時寫入)。可能是空串 (usage 未知/未落庫)。
  consumeMoney: string
  consumeCoins: string
  taskCostTime: string
  thirdPartyConsumeMoney: string
}

export interface AigcHistoryQuery {
  page?: number
  perPage?: number
  status?: string
  favorite?: boolean
  category?: string
  minRating?: number
  sort?: "newest" | "oldest" | "rating" | "favorite"
  signal?: AbortSignal
}

export type AigcHistoryPatch = Partial<Pick<AigcHistoryItem, "rating" | "favorite" | "category" | "note">>

// 哪些模型需要 30 分鐘級 deadline 而不是 8 分鐘. 視頻 / 音頻 / 3D 這類重任務都按長跑處理.
function _isLongRunningModel(modelName: string): boolean {
  const m = modelName.toLowerCase()
  return (
    m.includes("seedance") ||
    m.includes("sparkvideo") ||
    m.includes("happyhorse") ||
    m.includes("video") ||
    m.includes("audio") ||
    m.includes("music") ||
    m.includes("mureka") ||
    m.includes("song") ||
    m.includes("3d") ||
    m.includes("mesh") ||
    m.includes("hunyuan3d") ||
    m.includes("meshy") ||
    m.includes("marble")
  )
}

function buildHeaders(): Record<string, string> {
  // 自建登錄用 PocketBase authStore token; pb.collection(...) 請求由 SDK 自動攜帶。
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (pb.authStore.token) headers.Authorization = pb.authStore.token
  return headers
}

// 老代際後端兼容 (發佈刷新契約, provider_deploy 依賴 "legacyAigcRoutes" 這個標記判斷
// 本模板可以安全刷進老 app):
// 2026-07-01 aa25af8 之前的 aigc.pb.js 註冊的是按模型分路由
// (/api/aigc/<model>/submit|jobs/{id}/poll|history...), 沒有扁平路由。發佈刷新
// 只換前端 lib、不動 app 已裝的 pb_hooks, 所以扁平路由 404 時自動降級到按模型
// 路由並記住 (同一個後端只有一種代際)。新後端永遠不會命中 404, 零開銷。
// upload / price-preview / models 是新代際纔有的路由, 老頁面代碼不會調用, 不降級。
let legacyAigcRoutes: boolean | null = null

function aigcRouteUrl(flat: string, legacy: string | null): string {
  const base = getPocketBaseUrl()
  return `${base}${legacyAigcRoutes === true && legacy ? legacy : flat}`
}

// 探測式 fetch: 扁平路由 404 且代際未定時, 改打老代際路由重試一次並記住結果;
// 重試仍 404 (後端兩種路由都沒有) 則復位探測狀態並原樣返回 404。
async function fetchAigcRoute(flat: string, legacy: string | null, init: RequestInit): Promise<Response> {
  let res = await fetch(aigcRouteUrl(flat, legacy), init)
  if (res.status === 404 && legacyAigcRoutes === null && legacy) {
    legacyAigcRoutes = true
    res = await fetch(aigcRouteUrl(flat, legacy), init)
    if (res.status === 404) legacyAigcRoutes = null
  }
  return res
}

function classifySubmitBusinessError(data: Partial<AigcSubmitResponse> | null, fallback = ""): AigcFailure | null {
  const code = String(data?.errorCode || "")
  const rawError = String(data?.error || "")
  const message = String(data?.message || fallback || rawError || "")
  const detailCode = String(
    (data as { detail?: { code?: string } | string } | null)?.detail &&
      typeof (data as { detail?: { code?: string } | string }).detail === "object"
      ? ((data as { detail?: { code?: string } }).detail?.code || "")
      : (data as { detail?: string } | null)?.detail || "",
  )
  if (isLoginRequiredSignal(0, code, rawError, message, detailCode, fallback, data)) {
    return loginRequiredFailure({ error: "login_required" })
  }
  const hay = `${code} ${rawError} ${message}`.toLowerCase()
  if (
    rawError === "provider_insufficient_balance" ||
    code === "605" ||
    hay.includes("insufficient") ||
    hay.includes("balance") ||
    hay.includes("餘額") ||
    hay.includes("點數") ||
    hay.includes("積分")
  ) {
    return { status: "failed", errorKind: "insufficient_balance", error: message || "AI provider 賬戶餘額不足" }
  }
  if (
    rawError === "provider_content_audit" ||
    /content security audit|內容安全審查|內容審查|審覈未通過|content moderation/i.test(message)
  ) {
    return { status: "failed", errorKind: "content_audit", error: message || "內容審覈未通過" }
  }
  if (rawError || code || message) {
    return { status: "failed", errorKind: "submit", error: message || rawError || "submit failed" }
  }
  return null
}

// 單次 submit, 不 poll. 多數頁面應使用 callAigcAndPoll, 它已內置 poll 循環 + 錯誤映射.
// 直接用本函數的場景: 用戶希望非阻塞提交後自己手工 poll (例如把 taskId 存 PB 後異步處理).
// 泛型默認 AigcSubmitResponse; 存量代碼 callAigc<AigcResponse<X>>(...) 也兼容。
export async function callAigc<T = AigcSubmitResponse>(path: string, body: unknown): Promise<T> {
  const base = getPocketBaseUrl()
  const url = `${base}${path.startsWith("/") ? path : "/" + path}`
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: buildHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw Object.assign(new Error(`AIGC ${path} failed: HTTP ${res.status}`), {
      status: res.status,
      body: text,
    })
  }
  return (await res.json()) as T
}

// AI 應用 (provider-app) 異步 job 形態的薄封裝: run / jobs/<id>/poll / upload / history 都是 POST,
// 返回 envelope 跟標準模型不同 (provider-app.v1)。複用 callAigc 的 buildHeaders + __pb 代理,
// 只放開返回類型, 由調用方按 AiAppRunResponse / AiAppUploadResponse 等斷言。
// 前端**禁止**裸 fetch /api/aigc (發佈 publish-aigc-auth-scan 會攔), AI 應用一律走這個。
export async function callAiApp<T>(path: string, body: unknown): Promise<T> {
  return (await callAigc(path, body)) as unknown as T
}

// AI 應用 (provider-app) 的輸出條目, 來自 /run 與 /jobs/<id>/poll 的 outputs/results。
export interface AiAppOutput {
  id?: string
  type: "image" | "video" | "audio" | "text" | "file"
  url: string
  text?: string
  fileType?: string
  filename?: string
  nodeId?: string
}

// AI 應用 run/poll 的統一響應包絡 (version: provider-app.v1)。
// usage 只在終態 (succeeded/failed) 出現, 是真實扣費明細。
export interface AiAppRunResponse {
  ok: boolean
  version: "provider-app.v1"
  state: "queued" | "running" | "succeeded" | "failed" | "partial"
  job?: { jobId: string; taskId: string; state: string }
  outputs?: AiAppOutput[]
  results?: AiAppOutput[]
  usage?: AigcUsage
  error?: { code: string; message: string; retryable: boolean; taskId?: string; failedNode?: unknown }
}

export interface AiAppUploadResponse {
  ok: boolean
  fileName: string
}

export interface AigcUploadResponse {
  ok: boolean
  type: string
  download_url: string
  downloadUrl: string
  fileName: string
  size?: string
}

// upload 的老代際路由是 /api/aigc/media/upload (返回 { ok, downloadUrl }), 新代際是
// /api/aigc/upload。發佈刷新只換前端 lib、不動 app 已裝的 pb_hooks, 老後端上新路由
// 404 (真實事故: app-bcbdf4c8 老 hook + 刷新後新 lib, 上傳全 404) —— 與
// legacyAigcRoutes 同理探測降級並記住。provider_deploy 依賴 "legacyAigcUploadRoute"
// 這個標記判斷本模板可以安全刷進老代際後端的 app。
let legacyAigcUploadRoute: boolean | null = null

const AIGC_UPLOAD_FILE_TYPES = ["image", "audio", "video", "zip"] as const
type AigcUploadFileType = (typeof AIGC_UPLOAD_FILE_TYPES)[number]

// 契約兼容 (勿刪): 老世代 lib 的簽名是 uploadAigcMedia(file, filename) => Promise<string
// (URL)>, 而新世代是 (file, fileType) => Promise<AigcUploadResponse>。發佈刷新只換本
// 文件、不動 app 頁面代碼, 老頁面拿新 lib 會把響應對象塞進 image_url → RH/火山側
// "content[N].image_url is invalid" (真實事故: app-bcbdf4c8 刷新後當天 190 個該錯誤)。
// 打包器不做類型檢查, 這種同名不同契約的漂移不會在構建期暴露, 只能運行時多態:
// 第二參不在 fileType 白名單裏 → 判定爲老契約的 filename, 走老行爲返回純 URL 字符串。
export async function uploadAigcMedia(file: File | Blob, fileType?: AigcUploadFileType): Promise<AigcUploadResponse>
export async function uploadAigcMedia(file: File | Blob, legacyFilename: string): Promise<string>
export async function uploadAigcMedia(
  file: File | Blob,
  second: string = "image",
): Promise<AigcUploadResponse | string> {
  const legacyCall = !(AIGC_UPLOAD_FILE_TYPES as readonly string[]).includes(second)
  const legacyFilename = legacyCall ? second : ""
  const fileType: AigcUploadFileType = legacyCall
    ? (AIGC_UPLOAD_FILE_TYPES.find((t) => file.type.startsWith(`${t}/`)) ?? "image")
    : (second as AigcUploadFileType)
  const base = getPocketBaseUrl()
  const headers: Record<string, string> = { ...getAuthHeaders() }
  if (pb.authStore.token) headers.Authorization = pb.authStore.token
  const doPost = (path: string) => {
    const form = new FormData()
    form.append("fileType", fileType)
    if (legacyFilename) form.append("file", file, legacyFilename)
    else form.append("file", file)
    return fetch(`${base}${path}`, { method: "POST", credentials: "include", headers, body: form })
  }
  let res = await doPost(legacyAigcUploadRoute === true ? "/api/aigc/media/upload" : "/api/aigc/upload")
  if (res.status === 404 && legacyAigcUploadRoute === null) {
    legacyAigcUploadRoute = true
    res = await doPost("/api/aigc/media/upload")
    if (res.status === 404) legacyAigcUploadRoute = null
  }
  if (res.status === 412 || res.status === 401) {
    // 老契約調用方靠 .status === 412 識別"需要重新登錄"; 401 SANDBOX_TOKEN_* 歸一成 412 保兼容。
    throw Object.assign(new Error("login_required"), { status: 412 })
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw Object.assign(new Error(`AIGC upload failed: HTTP ${res.status}`), {
      status: res.status,
      body: text,
    })
  }
  const data = (await res.json()) as AigcUploadResponse
  // 老路由只返回 { ok, downloadUrl }; 補齊新契約字段, 讓兩代後端對調用方無差別。
  if (!data.download_url && data.downloadUrl) data.download_url = data.downloadUrl
  if (!data.downloadUrl && data.download_url) data.downloadUrl = data.download_url
  if (!data.fileName) data.fileName = legacyFilename || (file instanceof File ? file.name : "upload.bin")
  if (legacyCall) return data.downloadUrl || data.download_url || ""
  return data
}

// AI 應用媒體上傳: 瀏覽器原生 FormData 把文件以二進制直傳給後端, 後端用 Go 原生
// $filesystem.fileFromMultipart() 拿文件, 完全跳過 base64。**視頻/音頻/大圖必須走這個**——
// 不要再用 fileToDataUrl 把幾十 MB 視頻轉 base64 塞 JSON: Goja 單線程逐字符解碼會鎖死 PB → 502/524。
// 本文件是 publish-aigc-auth-scan 的唯一豁免文件, 這裏裸 fetch 合規;
// 不要手動設 Content-Type, 讓瀏覽器自動帶 multipart boundary (buildHeaders 會設 json, 故這裏手搓 header)。
export async function uploadAiAppMedia(
  slug: string,
  file: File,
  fileType: "image" | "audio" | "video",
): Promise<AiAppUploadResponse> {
  const base = getPocketBaseUrl()
  const url = `${base}/api/aigc/ai-app/${slug}/upload?fileType=${encodeURIComponent(fileType)}`
  const headers: Record<string, string> = { ...getAuthHeaders() }
  if (pb.authStore.token) headers.Authorization = pb.authStore.token
  const form = new FormData()
  form.append("fileType", fileType)
  form.append("file", file)
  const res = await fetch(url, { method: "POST", credentials: "include", headers, body: form })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw Object.assign(new Error(`AI app upload failed: HTTP ${res.status}`), {
      status: res.status,
      body: text,
    })
  }
  return (await res.json()) as AiAppUploadResponse
}

// 共享 poll 循環, 被 callAigcAndPoll (提交後立即 poll) 和 resumeAigcJob (對已有 jobId 恢復 poll,
// 例如頁面掛載時接着跑 loadAigcHistory() 裏狀態還是 running 的任務) 複用 —— 兩者的輪詢/超時/錯誤
// 映射語義必須完全一致, 不要各寫一份容易漂移。
// opts.upstreamTaskId / opts.model 只用於成功時回填 AigcSuccess.upstreamTaskId/model 展示字段, 不影響請求本身
// (poll 請求只需要 jobId/taskId, 後端會自己查表拿 upstream_task_id)。
async function pollAigcToResult(
  taskId: string,
  opts: {
    pollIntervalMs?: number
    deadlineMs?: number
    signal?: AbortSignal
    upstreamTaskId?: string
    model?: string
  },
): Promise<AigcResult> {
  const defaultDeadline = _isLongRunningModel(opts.model || "") ? 30 * 60_000 : 8 * 60_000
  const pollFlat = `/api/aigc/jobs/${encodeURIComponent(taskId)}/poll`
  // 老代際 poll 路由帶模型名; resume 場景 item.model 缺失時無法構造, 降級不可用
  const pollLegacy = opts.model
    ? `/api/aigc/${encodeURIComponent(opts.model)}/jobs/${encodeURIComponent(taskId)}/poll`
    : null
  const deadline = Date.now() + (opts.deadlineMs ?? defaultDeadline)
  let interval = opts.pollIntervalMs ?? 2500

  while (Date.now() < deadline) {
    if (opts.signal?.aborted) {
      return { status: "failed", taskId, errorKind: "aborted", error: "aborted" }
    }
    await new Promise((r) => setTimeout(r, interval))
    interval = Math.min(interval + 500, 5000)

    let pollRes: Response
    try {
      pollRes = await fetchAigcRoute(pollFlat, pollLegacy, {
        method: "POST",
        credentials: "include",
        headers: buildHeaders(),
        body: "{}",
        signal: opts.signal,
      })
    } catch (e) {
      const aborted = (e as { name?: string })?.name === "AbortError"
      if (aborted) {
        return { status: "failed", taskId, errorKind: "aborted", error: "aborted" }
      }
      // 網絡抖動 / PB 重啓窗口 → 當作 RUNNING, 繼續 poll
      continue
    }

    if (pollRes.status === 412 || pollRes.status === 401) {
      const data = (await pollRes.json().catch(() => ({}))) as { error?: string; message?: string }
      return loginRequiredFailure({ taskId, error: data.message || data.error || "login_required" })
    }
    // 兩種代際路由都 404 = 後端根本沒有這個 poll 路由, 快速失敗, 不要空轉到 deadline
    if (pollRes.status === 404) {
      return { status: "failed", taskId, errorKind: "poll", error: "poll route not found (HTTP 404)" }
    }
    if (!pollRes.ok) continue // 5xx / 其它 4xx 當瞬時, 繼續 poll

    const data = (await pollRes.json().catch(() => ({}))) as AigcPollResponse
    const status = String(data.status || "RUNNING").toUpperCase()
    if (status === "SUCCESS") {
      const outputs = data.outputs || []
      const first = outputs.find((o) => !o.type || o.type === "image" || o.type === "video") || outputs[0]
      return {
        status: "success",
        taskId,
        upstreamTaskId: opts.upstreamTaskId,
        outputs,
        url: first?.url || "",
        model: data.model || opts.model,
        usage: data.usage,
      }
    }
    if (status === "FAILED" || status === "CANCEL") {
      const errMsg = (data.error || data.message || "task_failed") as string
      // 內容審覈失敗的固定特徵 — 重試同 prompt 救不回, 必須用 content_audit 讓前端
      // 顯示"換個表達試試", 不能跟普通 poll 錯混在一起
      const isContentAudit =
        /content security audit|內容安全審查|內容審查|審覈未通過|content moderation/i.test(errMsg)
      return {
        status: "failed",
        taskId,
        errorKind: isContentAudit ? "content_audit" : "task_failed",
        error: errMsg,
        usage: data.usage,
      }
    }
    // RUNNING / QUEUED → 繼續 loop
  }

  return { status: "failed", taskId, errorKind: "timeout", error: "poll timeout" }
}

// 提交 + 自動 poll, 一次調用拿到出圖 / 視頻 URL. 失敗 / 超時 / 412 全部返回結構化 AigcResult, **不 throw**.
//
// 模型代碼只需要:
//   const r = await callAigcAndPoll("seedream-4.5-white", { prompt, ... })
//   if (r.status === "success") { /* r.url, r.outputs */ } else { /* r.error, r.errorKind, r.needsLogin? */ }
//
// modelName: 模型短名 (必須在後端 ALLOWED_MODELS 中)
//   實際請求路徑: /api/aigc/submit(body.model) + /api/aigc/jobs/<taskId>/poll
// body: 模型專屬字段, 跟 provider-openapi reference 對齊.
//   常見字段:
//     - prompt: string (文生圖必填)
//     - aspectRatio: "1:1" | "3:4" | "16:9" 等
//     - resolution: "1k" | "2k" | "4k"  (具體取值看 reference)
//     - imageUrls: string[]  (圖生圖 / 圖編輯必填, use uploadAigcMedia(file).downloadUrl or another public URL)
//     - duration / generateAudio / ratio / realPersonMode  (視頻特有, 看 seedance reference)
//     - page: string  (推薦傳頁面 slug, 用於審計)
// opts.pollIntervalMs: 默認 2500ms, 每次 +500 至 5000ms 上限
// opts.deadlineMs: 默認 8 分鐘 (image, 給 BananaPro 4k / 多參考圖 + 隊列繁忙留餘量), **視頻/音頻/3D 模型自動延長到 30 分鐘** (按 modelName 識別 seedance/sparkvideo/happyhorse/video/audio/music/3d/mesh 等)
// opts.signal: AbortSignal, 中止時 result 爲 { status: "failed", errorKind: "aborted" }
export async function callAigcAndPoll(
  modelName: string,
  body: unknown,
  opts?: { pollIntervalMs?: number; deadlineMs?: number; signal?: AbortSignal },
): Promise<AigcResult> {
  const submitFlat = `/api/aigc/submit`
  const submitLegacy = `/api/aigc/${encodeURIComponent(modelName)}/submit`
  const submitBody = { ...((body || {}) as Record<string, unknown>), model: modelName }

  // submit 撞 PB 熱重載窗口 (1-2 秒) 時會拿到 connection refused / 5xx,
  // 這時不能直接 return failed (用戶體驗是"點生成沒反應"), 等 1.5s retry, 最多 3 次.
  // 跟 poll 階段的 fetch throw → continue 兜底對齊.
  let submitRes: Response | null = null
  let lastSubmitErr = ""
  for (let attempt = 0; attempt < 3; attempt++) {
    if (opts?.signal?.aborted) {
      return { status: "failed", errorKind: "aborted", error: "aborted" }
    }
    try {
      const r = await fetchAigcRoute(submitFlat, submitLegacy, {
        method: "POST",
        credentials: "include",
        headers: buildHeaders(),
        body: JSON.stringify(submitBody),
        signal: opts?.signal,
      })
      // 412 (登錄態過期) 和 4xx (業務錯) 不重試 — 重試也救不回來
      if (r.status === 412 || (r.status >= 400 && r.status < 500)) {
        submitRes = r
        break
      }
      // 5xx → 大概率 PB 熱重載窗口或上游瞬時錯, 重試
      if (!r.ok) {
        const text = await r.text().catch(() => "")
        lastSubmitErr = `submit HTTP ${r.status} ${text.slice(0, 200)}`
        if (attempt < 2) {
          await new Promise((res) => setTimeout(res, 1500))
          continue
        }
        submitRes = r
        break
      }
      // 2xx → 成功
      submitRes = r
      break
    } catch (e) {
      const aborted = (e as { name?: string })?.name === "AbortError"
      if (aborted) {
        return { status: "failed", errorKind: "aborted", error: "aborted" }
      }
      // 網絡層錯誤 (connection refused / PB 進程沒起 / DNS 等), 大概率 PB 熱重載窗口
      lastSubmitErr = String((e as Error)?.message || e)
      if (attempt < 2) {
        await new Promise((res) => setTimeout(res, 1500))
        continue
      }
      return { status: "failed", errorKind: "submit", error: lastSubmitErr }
    }
  }

  if (!submitRes) {
    return { status: "failed", errorKind: "submit", error: lastSubmitErr || "submit failed" }
  }

  if (submitRes.status === 412 || submitRes.status === 401) {
    const text = await submitRes.text().catch(() => "")
    let data: { error?: string; message?: string; detail?: { code?: string } | string } = {}
    try {
      data = JSON.parse(text || "{}") as typeof data
    } catch {
      data = {}
    }
    if (isLoginRequiredSignal(submitRes.status, text, data, data.detail)) {
      return loginRequiredFailure({ error: data.message || data.error || "login_required" })
    }
  }
  if (!submitRes.ok) {
    const text = await submitRes.text().catch(() => "")
    let data: Partial<AigcSubmitResponse> | null = null
    try {
      data = JSON.parse(text || "{}") as Partial<AigcSubmitResponse>
    } catch {
      data = null
    }
    if (isLoginRequiredSignal(submitRes.status, text, data)) {
      return loginRequiredFailure({ error: "login_required" })
    }
    const businessErr = classifySubmitBusinessError(data, text.slice(0, 200))
    if (businessErr) return businessErr
    return {
      status: "failed",
      errorKind: "submit",
      error: `submit HTTP ${submitRes.status} ${text.slice(0, 200)}`,
    }
  }

  const sub = (await submitRes.json()) as AigcSubmitResponse
  const taskId = sub.taskId
  if (!taskId) {
    const businessErr = classifySubmitBusinessError(sub)
    if (businessErr) return businessErr
    return { status: "failed", errorKind: "submit", error: "submit returned no taskId" }
  }

  return pollAigcToResult(taskId, {
    pollIntervalMs: opts?.pollIntervalMs,
    deadlineMs: opts?.deadlineMs,
    signal: opts?.signal,
    upstreamTaskId: sub.upstreamTaskId,
    model: sub.model || modelName,
  })
}

// 恢復一個已提交、還沒跑到終態的任務的 poll —— 用於頁面掛載 (或用戶手動點開"進行中"任務) 時,
// 把 loadAigcHistory() 裏 status === "running" 的歷史項接着跑完, 而不是讓它在瀏覽器刷新/關閉重開後
// 就再也沒人推進 (那邊任務其實早就跑完了, 只是沒人來 poll 把結果寫回 aigc_tasks)。
//
// 頁面標準用法 (掛載時):
//   const items = await loadAigcHistory("seedream-4.5-white")
//   const runningItems = items.filter((it) => it.status === "running")
//   runningItems.forEach((it) => {
//     // 先把 it 渲染成"進行中"卡片, 再後臺續跑:
//     resumeAigcJob(it).then((r) => { /* 更新這張卡片: success → url, failed → error */ })
//   })
//
// 跟 callAigcAndPoll 的核心區別: 不需要重新 submit, 直接對已有 jobId 繼續 poll。如果 那邊
// 早已完成, 第一次 poll 就會拿到終態並順帶把 PB 記錄寫成 success/failed —— 不會因爲"用戶來晚了"
// 就丟結果。deadline 仍按 item.model 是否爲視頻/音頻等長任務模型選 8/30 分鐘, 不是"從任務提交時刻
// 算起還剩多久", 而是"從這次 resume 調用開始, 最多再等這麼久", 所以對一個已經跑了很久的任務重新
// resume 也不會立刻超時。
export async function resumeAigcJob(
  item: { jobId: string; model?: string },
  opts?: { pollIntervalMs?: number; deadlineMs?: number; signal?: AbortSignal },
): Promise<AigcResult> {
  return pollAigcToResult(item.jobId, {
    pollIntervalMs: opts?.pollIntervalMs,
    deadlineMs: opts?.deadlineMs,
    signal: opts?.signal,
    model: item.model,
  })
}

// ============ AI 應用 (provider-app) 的提交/輪詢/恢復 helper, 與標準模型的 callAigcAndPoll /
// resumeAigcJob / formatAigcFailureMessage 完全對稱。頁面不要自己寫 while poll 循環。 ============

export interface AiAppPollOpts {
  // 默認 3000ms, 與舊版 useAiAppPage 模板行爲一致
  pollIntervalMs?: number
  // 默認 60 分鐘 (AI 應用是整條 workflow, 常遠慢於單模型調用)
  deadlineMs?: number
  signal?: AbortSignal
}

function aiAppFailure(code: string, message: string, jobId: string, retryable = false): AiAppRunResponse {
  return {
    ok: false,
    version: "provider-app.v1",
    state: "failed",
    job: { jobId, taskId: "", state: "failed" },
    outputs: [],
    results: [],
    error: { code, message, retryable },
  }
}

// 共享 poll 循環, 被 callAiAppAndPoll (提交後立即 poll) 和 resumeAiAppJob (對已有 jobId 恢復 poll)
// 複用。終態一律以 AiAppRunResponse 形式返回, **不 throw**:
// - 超時       → error.code = "TIMEOUT"
// - 連續斷網   → error.code = "NETWORK"
// - 取消       → error.code = "ABORTED"
// - 412/401/登錄錯 → error.code = "PROVIDER_LOGIN_REQUIRED" (頁面據此翻 needsLogin)
async function pollAiAppToResult(slug: string, jobId: string, opts?: AiAppPollOpts): Promise<AiAppRunResponse> {
  const interval = opts?.pollIntervalMs ?? 3000
  const deadline = Date.now() + (opts?.deadlineMs ?? 60 * 60_000)
  let consecutiveFails = 0
  while (true) {
    if (opts?.signal?.aborted) return aiAppFailure("ABORTED", "已取消", jobId)
    if (Date.now() > deadline) return aiAppFailure("TIMEOUT", "生成超時, 請重試", jobId, true)
    await new Promise((r) => setTimeout(r, interval))
    try {
      const pollRes = await callAiApp<AiAppRunResponse>(`/api/aigc/ai-app/${slug}/jobs/${encodeURIComponent(jobId)}/poll`, {})
      consecutiveFails = 0
      if (pollRes.state === "succeeded" || pollRes.state === "failed" || pollRes.state === "partial") {
        return pollRes
      }
      // queued / running → 繼續 loop
    } catch (e) {
      const status = Number((e as { status?: number })?.status || 0)
      const body = String((e as { body?: string })?.body || "")
      const msg = String((e as Error)?.message || e)
      if ((e as { name?: string })?.name === "AbortError") return aiAppFailure("ABORTED", "已取消", jobId)
      if (isLoginRequiredSignal(status, msg, body)) {
        return aiAppFailure("PROVIDER_LOGIN_REQUIRED", LOGIN_REQUIRED_ZH, jobId)
      }
      consecutiveFails++
      if (consecutiveFails >= 5) {
        return aiAppFailure("NETWORK", "網絡連接不穩定, 請檢查網絡後重試", jobId, true)
      }
    }
  }
}

// 提交 AI 應用 run + 自動 poll 到終態, 一次調用拿到 outputs。失敗/超時/412 全部返回結構化
// AiAppRunResponse (state === "failed" + error), **不 throw**。
// 頁面標準用法:
//   const r = await callAiAppAndPoll(SLUG, runBody)
//   if (r.state === "succeeded") { /* r.outputs, r.usage */ }
//   else { setErrorMsg(formatAiAppFailureMessage(r)); if (r.error?.code === "PROVIDER_LOGIN_REQUIRED") setNeedsLogin(true) }
export async function callAiAppAndPoll(slug: string, body: unknown, opts?: AiAppPollOpts): Promise<AiAppRunResponse> {
  let submitRes: AiAppRunResponse
  try {
    submitRes = await callAiApp<AiAppRunResponse>(`/api/aigc/ai-app/${slug}/run`, body)
  } catch (e) {
    const status = Number((e as { status?: number })?.status || 0)
    const errBody = String((e as { body?: string })?.body || "")
    const msg = String((e as Error)?.message || e)
    if (isLoginRequiredSignal(status, msg, errBody)) {
      return aiAppFailure("PROVIDER_LOGIN_REQUIRED", LOGIN_REQUIRED_ZH, "")
    }
    return aiAppFailure("SUBMIT_FAILED", msg || "提交失敗, 請重試", "", true)
  }
  if (
    submitRes.error?.code?.startsWith("APIKEY") ||
    isLoginRequiredSignal(0, submitRes.error?.code, submitRes.error?.message)
  ) {
    return aiAppFailure("PROVIDER_LOGIN_REQUIRED", LOGIN_REQUIRED_ZH, "")
  }
  const jobId = submitRes.job?.jobId
  if (!jobId) {
    // 同步完成 (部分 AI 應用 run 直接帶 outputs 返回終態)
    if (submitRes.state === "succeeded" || submitRes.state === "failed") return submitRes
    return aiAppFailure(submitRes.error?.code || "SUBMIT_FAILED", submitRes.error?.message || "提交失敗, 請重試", "", true)
  }
  return pollAiAppToResult(slug, jobId, opts)
}

// 恢復一個已提交、還沒跑到終態的 AI 應用任務的 poll —— 用於頁面掛載 (或用戶手動點開"進行中"任務)
// 時, 把 history 裏 status === "running" 的歷史項接着跑完, 而不是讓它在瀏覽器刷新/關閉重開後
// 就再也沒人推進 (那邊任務其實早就跑完了, 只是沒人來 poll 把結果寫回 aigc_tasks)。
// 頁面標準用法 (掛載時):
//   const r = await callAiApp<{ ok: boolean; items?: AigcHistoryItem[] }>(`/api/aigc/ai-app/${SLUG}/history`, {})
//   r.items?.filter((it) => it.status === "running").forEach((it) => {
//     // 先把 it 渲染成"進行中"卡片, 再後臺續跑:
//     resumeAiAppJob(SLUG, it).then((res) => { /* 更新這張卡片: succeeded → url, failed → error */ })
//   })
// deadline 從這次 resume 調用開始計, 對已跑很久的任務重新 resume 不會立刻超時。
export async function resumeAiAppJob(
  slug: string,
  item: { jobId: string },
  opts?: AiAppPollOpts,
): Promise<AiAppRunResponse> {
  return pollAiAppToResult(slug, item.jobId, opts)
}

const AI_APP_ERROR_MESSAGES_ZH: Record<string, string> = {
  PROVIDER_LOGIN_REQUIRED: LOGIN_REQUIRED_ZH,
  TIMEOUT: "AI 生成超時 (可能服務器繁忙), 請稍後重試",
  NETWORK: "網絡連接不穩定, 請檢查網絡後重試",
  ABORTED: "已取消",
  SUBMIT_FAILED: "提交生成任務失敗 (網絡或服務器繁忙), 請稍後重試",
}

// AiAppRunResponse 失敗分支 → 中文詳情的默認安全格式化, 鏡像 formatAigcFailureMessage。
// 對**所有**錯誤碼都把 AI provider 返回的真實原因拼在中文文案後面 (除非與基礎文案重複), 不做
// 白名單挑着拼 —— 白名單漏掉的分支會把 真實報錯 (如 "音頻時長過短") 吞掉。
// 頁面處理失敗分支時直接調用這個函數, 不要自己按 error.code 寫一份映射。
// PROVIDER_LOGIN_REQUIRED / SANDBOX_TOKEN_* 只展示登錄引導, 不拼技術碼。
export function formatAiAppFailureMessage(res: AiAppRunResponse): string {
  const code = String(res.error?.code || "")
  const raw = String(res.error?.message || "")
  const hay = `${code} ${raw}`.toLowerCase()
  let base = AI_APP_ERROR_MESSAGES_ZH[code] || ""
  if (!base) {
    if (code.startsWith("APIKEY") || isLoginRequiredSignal(0, code, raw)) base = AI_APP_ERROR_MESSAGES_ZH.PROVIDER_LOGIN_REQUIRED
    else if (hay.includes("insufficient") || hay.includes("balance") || hay.includes("餘額") || hay.includes("點數") || hay.includes("積分")) base = "AI provider 賬戶餘額不足, 請充值後重試"
    else if (/content security audit|內容安全審查|內容審查|審覈未通過|content moderation/i.test(raw)) base = "內容審覈未通過"
    else base = "生成失敗, 請稍後重試或換個 prompt"
  }
  if (base === AI_APP_ERROR_MESSAGES_ZH.PROVIDER_LOGIN_REQUIRED) return base
  if (raw && raw !== base) return `${base}: ${raw}`
  return base
}

// 加載當前 用戶在該模型下的歷史任務 (默認按 -created 倒序). 用於頁面掛載時恢復歷史:
// 把最近一張成功結果 (status === "success" && resultUrl) 恢復到主展示區, 避免刷新後空白。
//   const items = await loadAigcHistory("seedream-4.5-white")
//   const last = items.find((it) => it.status === "success" && it.resultUrl)
//   if (last) setResultUrl(last.resultUrl)
// 失敗時返回 [] (不 throw), 讓頁面優雅降級到空歷史。
export async function loadAigcHistory(
  modelName: string,
  opts?: AigcHistoryQuery,
): Promise<AigcHistoryItem[]> {
  try {
    const res = await fetchAigcRoute(`/api/aigc/history`, `/api/aigc/${encodeURIComponent(modelName)}/history`, {
      method: "POST",
      credentials: "include",
      headers: buildHeaders(),
      body: JSON.stringify({
        page: opts?.page ?? 1,
        perPage: opts?.perPage ?? 20,
        status: opts?.status,
        favorite: opts?.favorite,
        category: opts?.category,
        minRating: opts?.minRating,
        sort: opts?.sort,
        model: modelName,
      }),
      signal: opts?.signal,
    })
    if (!res.ok) return []
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; items?: AigcHistoryItem[] }
    return Array.isArray(data.items) ? data.items : []
  } catch {
    return []
  }
}

export async function updateAigcHistoryItem(
  modelName: string,
  jobId: string,
  patch: AigcHistoryPatch,
): Promise<AigcHistoryItem | null> {
  const res = await fetchAigcRoute(
    `/api/aigc/history/${encodeURIComponent(jobId)}/update`,
    `/api/aigc/${encodeURIComponent(modelName)}/history/${encodeURIComponent(jobId)}/update`,
    {
      method: "POST",
      credentials: "include",
      headers: buildHeaders(),
      body: JSON.stringify({ ...patch, model: modelName }),
    },
  )
  if (!res.ok) return null
  const data = (await res.json().catch(() => ({}))) as { item?: AigcHistoryItem }
  return data.item || null
}

export async function deleteAigcHistoryItem(modelName: string, jobId: string): Promise<boolean> {
  const res = await fetchAigcRoute(
    `/api/aigc/history/${encodeURIComponent(jobId)}/delete`,
    `/api/aigc/${encodeURIComponent(modelName)}/history/${encodeURIComponent(jobId)}/delete`,
    {
      method: "POST",
      credentials: "include",
      headers: buildHeaders(),
      body: JSON.stringify({ model: modelName }),
    },
  )
  if (!res.ok) return false
  const data = (await res.json().catch(() => ({}))) as { deleted?: boolean }
  return !!data.deleted
}

export async function listAigcModels(): Promise<AigcModelInfo[]> {
  const res = await fetch(`${getPocketBaseUrl()}/api/aigc/models`, {
    method: "GET",
    credentials: "include",
    headers: buildHeaders(),
  })
  if (!res.ok) return []
  const data = (await res.json().catch(() => ({}))) as { models?: AigcModelInfo[] }
  return Array.isArray(data.models) ? data.models : []
}

// listAigcModels() 的便捷查找: 拿到單個模型的參數契約 (scalar_params 的 enum/required/default,
// media_params 的 multiple/max_num), 用於頁面掛載時驅動分辨率/比例/多圖上傳等控件的渲染。
// 找不到時返回 null —— 調用方應回退到"只渲染主文本輸入", 不要因此崩潰或整頁報錯。
export async function getAigcModelInfo(modelName: string): Promise<AigcModelInfo | null> {
  const models = await listAigcModels()
  return models.find((m) => m.model === modelName) || null
}

// 多圖/多文件上傳的標準通路 —— media_params.multiple=true 的參數 (如圖生圖 imageUrls) 必須走這個,
// 不能只接單圖。逐個錯峯 (~300ms) 發起, 避免同一時刻打滿 /api/aigc/upload; 單個文件上傳失敗會被
// 跳過而不是讓整批失敗。opts.maxCount 通常傳契約裏的 max_num, 超出的文件直接截斷丟棄。
// 返回的 downloadUrl 順序對應輸入 files 裏成功項的相對順序 (失敗項被過濾掉, 不佔位)。
export async function uploadAigcMediaFiles(
  files: File[],
  fileType: "image" | "audio" | "video" | "zip" = "image",
  opts?: { maxCount?: number },
): Promise<string[]> {
  const capped = opts?.maxCount ? files.slice(0, opts.maxCount) : files
  const results = await Promise.all(
    capped.map(
      (file, i) =>
        new Promise<string>((resolve) => {
          setTimeout(() => {
            uploadAigcMedia(file, fileType)
              .then((res) => resolve(res.downloadUrl || ""))
              .catch(() => resolve(""))
          }, i * 300)
        }),
    ),
  )
  return results.filter((url) => !!url)
}

// 把 price-preview 響應格式化成徽標文案。有時只回 estimatedPrice、不回 priceText ——
// **禁止**頁面只判斷 `r.ok && r.priceText`(實測會永遠落到"按實際扣費"/假"預估中")。
// 返回 null = 本次拿不到價, View 用「按實際扣費」降級, 絕不能用「費用預估中」當失敗兜底。
export function formatAigcPricePreview(r: AigcPricePreview | null | undefined): string | null {
  if (!r || !r.ok) return null
  if (r.isFreeThisCall) return "本次免費"
  const text = typeof r.priceText === "string" ? r.priceText.trim() : ""
  if (text) return text
  if (typeof r.estimatedPrice === "number" && Number.isFinite(r.estimatedPrice)) {
    const currency = (r.currency || "CNY").trim() || "CNY"
    return `約 ${r.estimatedPrice} ${currency}`
  }
  return null
}

// 標準模型價格預估: body 跟提交 callAigcAndPoll(modelName, body) 時完全一樣的參數即可 (會自動加
// model 字段)。**從不 throw**, 網絡錯誤/端點不存在/模型不允許都歸一成 { ok: false }。
// 頁面用法: 參數變化時設 priceLoading=true → debounce (~500ms) 調本函數 →
// setPriceText(formatAigcPricePreview(r)) → finally priceLoading=false。
// View 徽標三態: priceLoading?'預估中':(priceText||'按實際扣費')。絕不能因爲預估失敗擋住生成。
export async function previewAigcPrice(
  modelName: string,
  body: unknown,
): Promise<AigcPricePreview> {
  try {
    const base = getPocketBaseUrl()
    const res = await fetch(`${base}/api/aigc/price-preview`, {
      method: "POST",
      credentials: "include",
      headers: buildHeaders(),
      body: JSON.stringify({ ...((body || {}) as Record<string, unknown>), model: modelName }),
    })
    if (!res.ok) return { ok: false, message: `HTTP ${res.status}` }
    return (await res.json().catch(() => ({ ok: false }))) as AigcPricePreview
  } catch (e) {
    return { ok: false, message: String((e as Error)?.message || e) }
  }
}

// AI 應用價格預估: body 跟提交 callAiApp(.../run, body) 時完全一樣的參數 (manifest.fields[].key
// 逐個平鋪在頂層)。AI 應用沒有固定單價, price-preview 端點未必覆蓋這類任務, 失敗(含 404)一律
// 歸一成 { ok: false } —— 頁面應隱藏價格徽標, 改顯示"按 AI provider 實際扣費", 不阻塞提交。
export async function previewAiAppPrice(slug: string, body: unknown): Promise<AigcPricePreview> {
  try {
    return await callAiApp<AigcPricePreview>(`/api/aigc/ai-app/${slug}/price-preview`, body)
  } catch (e) {
    return { ok: false, message: String((e as Error)?.message || e) }
  }
}

export async function updateAiAppHistoryItem(
  slug: string,
  jobId: string,
  patch: AigcHistoryPatch,
): Promise<AigcHistoryItem | null> {
  const res = await callAiApp<{ ok: boolean; item?: AigcHistoryItem }>(
    `/api/aigc/ai-app/${slug}/history/${encodeURIComponent(jobId)}/update`,
    patch,
  )
  return res.item || null
}

export async function deleteAiAppHistoryItem(slug: string, jobId: string): Promise<boolean> {
  const res = await callAiApp<{ ok: boolean; deleted?: boolean }>(
    `/api/aigc/ai-app/${slug}/history/${encodeURIComponent(jobId)}/delete`,
    {},
  )
  return !!res.deleted
}

/**
 * 跨域結果圖/視頻下載。直接用 a.href + a.download 對跨域 URL 無效(瀏覽器忽略
 * download 屬性, 退化成新標籤打開), 必須先 fetch 拿 blob, 再用本地 blob URL 觸發下載。
 */
export async function downloadAigcResult(url: string, filename?: string): Promise<void> {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const ext = blob.type.includes("video")
      ? "mp4"
      : blob.type.includes("png")
      ? "png"
      : "jpg"
    const name = filename ?? `result-${Date.now()}.${ext}`
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = blobUrl
    a.download = name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(blobUrl)
  } catch {
    window.open(url, "_blank") // 兜底: 至少能看到
  }
}

// ---- 歷史代際兼容導出（新代碼不要使用, 上傳請用 uploadAigcMedia / uploadAiAppMedia）----
// 2026-06 一代 lib 的頁面代碼 import { uploadRefImage(s) }（base64 dataURL 上傳）。
// 發佈刷新（provider_deploy 把舊 lib 刷成本模板）要求本文件導出面是全部歷史拷貝的
// 超集，否則 vite build 失敗觸發回滾保險絲，連登錄實現一起退回舊版，沙箱域
// 上傳鏈路實現同簽名薄包裝：dataURL → File → uploadAigcMedia（multipart）。
export async function uploadRefImage(
  dataUrl: string,
): Promise<{ download_url: string; fileName: string }> {
  const blob = await (await fetch(dataUrl)).blob()
  const ext = (blob.type.split("/")[1] || "png").split("+")[0]
  const file = new File([blob], `ref-${Date.now()}.${ext}`, { type: blob.type || "image/png" })
  const res = await uploadAigcMedia(file, "image")
  return { download_url: res.download_url || res.downloadUrl || "", fileName: res.fileName || "" }
}

// 批量版本: 與老簽名一致, 併發上傳, 任意一張失敗整體拋錯。
export async function uploadRefImages(
  dataUrls: string[],
): Promise<Array<{ download_url: string; fileName: string }>> {
  return Promise.all(dataUrls.map((u) => uploadRefImage(u)))
}

// 相對路徑 → 當前 origin 絕對 URL（老代際導出, persistMediaUrl 依賴）。
// 可用的媒體位址：外部 http(s) 連結，或我們自己落地後存的相對路徑。
// 成品自 2026-09 起改存相對路徑（絕對網址會綁死當次隧道網域），
// 所以任何「只認 http(s)」的判斷都會把自家成品整批丟掉。
export function isUsableMediaUrl(u: unknown): u is string {
  return typeof u === "string" && (/^https?:\/\//i.test(u) || u.startsWith("/api/files/"))
}

export function toAbsoluteUrl(path: string): string {
  if (!path) return path
  // 自家落地的成品一律走 /__pb 代理解析。
  // 舊資料可能存了絕對網址（當時的 cloudflared 隧道網域，早就失效），
  // 這裡在讀取時就地修正，不需要另外跑一次資料遷移。
  const own = path.match(/\/api\/files\/(?:generated|uploads|media_assets)\/.*$/i)
  if (own) return `${getPocketBaseUrl()}${own[0]}`
  if (/^https?:\/\//i.test(path)) return path
  if (typeof window === "undefined") return path
  return `${window.location.origin}${path}`
}

// 老代際"外鏈落地到 PB media_assets"接口（/api/media/persist 是老 pb_hooks 路由,
// 發佈刷新不動 app 已裝的 hooks, 所以端點仍在）。失敗一律返回原 URL 不阻塞主流程。
export async function persistMediaUrl(url: string, kind: string): Promise<string> {
  if (!url) return url
  if (url.includes("/api/files/media_assets/")) return toAbsoluteUrl(url)
  const base = getPocketBaseUrl()
  try {
    const res = await fetch(`${base}/api/media/persist`, {
      method: "POST",
      credentials: "include",
      headers: buildHeaders(),
      body: JSON.stringify({ url, kind }),
    })
    if (!res.ok) return url
    const data = (await res.json().catch(() => null)) as { ok?: boolean; url?: string } | null
    if (data?.ok && data.url) return toAbsoluteUrl(`${base}${data.url}`)
  } catch {
    // 落地失敗時先用原 URL 不阻塞主流程
  }
  return url
}

export async function persistMediaUrls(urls: string[], kind: string): Promise<string[]> {
  return Promise.all(urls.map((u) => persistMediaUrl(u, kind)))
}
