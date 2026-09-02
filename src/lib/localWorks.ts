// 本地作品存儲 —— 未登錄也可用的歷史記錄兜底（縮略圖 + 時間 + 玩法標籤）。
// 僅存生成結果元信息（provider CDN URL），不存任何 token / 賬號憑證。

import { pb, getPocketBaseUrl } from "./pb"

function storageKey(): string {
  const uid = pb.authStore.isValid ? pb.authStore.record?.id : null
  return `model-gen-works-v1:${uid ? String(uid) : "anon"}`
}
const MAX_ITEMS = 60

export interface LocalWork {
  id: string
  url: string
  createdIso: string
  modeLabel: string
  modelName: string
  prompt: string
  taskId?: string | null
  saved?: boolean
}

// 作品歷史以 PocketBase cloud_works 為準，localStorage 只當同步讀取快取。
// 為什麼要快取：loadLocalWorks() 是同步的，被 7 個 hook 拿去做 useState 初值，
// 改成 async 等於重寫每一頁。所以寫入時同步更新快取 + 非同步推上雲端，
// 登入或開頁時再從雲端灌回快取並通知訂閱者重讀。
// 好處：作品跟著帳號走，換一台電腦登入也看得到。

const listeners = new Set<() => void>()

/** 訂閱作品變動（雲端灌入完成時觸發）。回傳取消訂閱函數。 */
export function onWorksChanged(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function notify(): void {
  listeners.forEach((cb) => {
    try { cb() } catch { /* 單一訂閱者出錯不影響其他人 */ }
  })
}

function readCache(): LocalWork[] {
  try {
    const raw = localStorage.getItem(storageKey())
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as LocalWork[]) : []
  } catch {
    return []
  }
}

function writeCache(list: LocalWork[]): void {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(list.slice(0, MAX_ITEMS)))
  } catch {
    // 存滿 / 隱私模式 —— 靜默降級，不影響生成主鏈路
  }
}

function authed(): boolean {
  return !!(pb.authStore.isValid && pb.authStore.record?.id)
}

function cloudHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return token ? { Authorization: token, "Content-Type": "application/json" } : { "Content-Type": "application/json" }
}

// LocalWork 整包塞進 content，回讀時不失真；其餘欄位給「我的作品」頁做篩選用。
function toRow(w: LocalWork): Record<string, unknown> {
  return {
    kind: classifyWorkKind(w),
    asset_type: "local_work",
    title: (w.modeLabel || "").slice(0, 200),
    summary: (w.prompt || "").slice(0, 200),
    content: JSON.stringify(w),
    media_urls: w.url ? [w.url] : [],
    model_name: (w.modelName || "").slice(0, 120),
    source_page: "generator",
    local_key: w.id,
    synced_from_local: true,
  }
}

function fromRow(row: Record<string, unknown>): LocalWork | null {
  try {
    const raw = typeof row.content === "string" ? row.content : ""
    if (raw) {
      const parsed = JSON.parse(raw) as LocalWork
      if (parsed && typeof parsed.id === "string") return parsed
    }
  } catch { /* content 不是我們寫的格式，往下用欄位重建 */ }
  const media = Array.isArray(row.media_urls) ? (row.media_urls as string[]) : []
  const key = typeof row.local_key === "string" ? row.local_key : ""
  if (!key) return null
  return {
    id: key,
    url: media[0] || "",
    createdIso: typeof row.created === "string" ? row.created : new Date().toISOString(),
    modeLabel: typeof row.title === "string" ? row.title : "",
    modelName: typeof row.model_name === "string" ? row.model_name : "",
    prompt: typeof row.summary === "string" ? row.summary : "",
  }
}

// 雲端寫入一律 fire-and-forget：失敗只記 log，不能擋住使用者的生成流程。
function pushToCloud(w: LocalWork): void {
  if (!authed()) return
  void fetch(`${getPocketBaseUrl()}/api/cloud_works`, {
    method: "POST",
    headers: cloudHeaders(),
    body: JSON.stringify(toRow(w)),
  }).catch((err) => console.warn("cloud_works create failed", err))
}

async function findCloudId(localKey: string): Promise<string | null> {
  if (!authed()) return null
  try {
    const res = await fetch(
      `${getPocketBaseUrl()}/api/cloud_works?local_key=${encodeURIComponent(localKey)}&perPage=1`,
      { headers: cloudHeaders() },
    )
    if (!res.ok) return null
    const data = (await res.json()) as { items?: Array<{ id?: string }> }
    return data.items?.[0]?.id ?? null
  } catch {
    return null
  }
}

function patchCloud(localKey: string, body: Record<string, unknown>): void {
  if (!authed()) return
  void findCloudId(localKey).then((id) => {
    if (!id) return
    return fetch(`${getPocketBaseUrl()}/api/cloud_works/${id}`, {
      method: "PATCH",
      headers: cloudHeaders(),
      body: JSON.stringify(body),
    })
  }).catch((err) => console.warn("cloud_works update failed", err))
}

function deleteFromCloud(localKey: string): void {
  if (!authed()) return
  void findCloudId(localKey).then((id) => {
    if (!id) return
    return fetch(`${getPocketBaseUrl()}/api/cloud_works/${id}`, { method: "DELETE", headers: cloudHeaders() })
  }).catch((err) => console.warn("cloud_works delete failed", err))
}

/**
 * 從 PocketBase 拉回這個帳號的作品，覆蓋本地快取並通知訂閱者。
 * 未登入時不動快取（匿名桶維持原樣）。
 */
export async function hydrateWorksFromCloud(): Promise<LocalWork[]> {
  if (!authed()) return readCache()
  try {
    const res = await fetch(`${getPocketBaseUrl()}/api/cloud_works?perPage=200&sort=-created`, {
      headers: cloudHeaders(),
    })
    if (!res.ok) return readCache()
    const data = (await res.json()) as { items?: Array<Record<string, unknown>> }
    const rows = Array.isArray(data.items) ? data.items : []
    const works: LocalWork[] = []
    for (const row of rows) {
      const w = fromRow(row)
      if (w) works.push(w)
    }
    // 本地有、雲端還沒有的（例如離線時生成的）補推上去，不要弄丟。
    const cloudKeys = new Set(works.map((w) => w.id))
    const pending = readCache().filter((w) => !cloudKeys.has(w.id))
    pending.forEach(pushToCloud)

    const merged = [...pending, ...works].slice(0, MAX_ITEMS)
    writeCache(merged)
    notify()
    return merged
  } catch {
    return readCache()
  }
}

export function loadLocalWorks(): LocalWork[] {
  return readCache()
}

export function persistLocalWorks(list: LocalWork[]): void {
  writeCache(list)
}

export function appendLocalWork(work: LocalWork): LocalWork[] {
  const next = [work, ...readCache()].slice(0, MAX_ITEMS)
  writeCache(next)
  pushToCloud(work)
  return next
}

export function toggleWorkSaved(id: string): LocalWork[] {
  const next = readCache().map((w) => (w.id === id ? { ...w, saved: !w.saved } : w))
  writeCache(next)
  const updated = next.find((w) => w.id === id)
  if (updated) patchCloud(id, { content: JSON.stringify(updated) })
  return next
}

export function removeLocalWorkById(id: string): LocalWork[] {
  const next = readCache().filter((w) => w.id !== id)
  writeCache(next)
  deleteFromCloud(id)
  return next
}

// ---- 讀取輔助：類型分類 + 整套載荷解析（供「我的作品」等聚合頁使用）----
// 只讀函數，不影響上面任何寫入邏輯；modelName 前綴約定：
// 無前綴 = 圖生圖類（模特圖 / 場景圖 / 圖片工具），llm: = 文案，
// detail: = 詳情頁整套 JSON，video: = 視頻腳本整套 JSON，video-shot: = 單鏡頭視頻。

export type WorkKind = 'model' | 'scene' | 'copy' | 'detail_set' | 'video' | 'tool'

export const WORK_PREFIXES = {
  llm: 'llm:',
  detail: 'detail:',
  video: 'video:',
  videoShot: 'video-shot:',
} as const

const SCENE_MODE_LABELS = new Set([
  '餐桌靜物',
  '戶外草地',
  '節日氛圍',
  '純色棚拍',
  '咖啡廳',
  '海邊度假',
  '自定義場景',
  '場景生成',
])

export function classifyWorkKind(work: Pick<LocalWork, 'modelName' | 'modeLabel'>): WorkKind {
  const mn = work.modelName || ''
  if (mn.startsWith(WORK_PREFIXES.llm)) return 'copy'
  if (mn.startsWith(WORK_PREFIXES.detail)) return 'detail_set'
  if (mn.startsWith(WORK_PREFIXES.video) || mn.startsWith(WORK_PREFIXES.videoShot)) return 'video'
  if ((work.modeLabel || '').startsWith('圖片工具')) return 'tool'
  if (SCENE_MODE_LABELS.has(work.modeLabel || '')) return 'scene'
  return 'model'
}

export function isVideoShotWork(work: Pick<LocalWork, 'modelName'>): boolean {
  return (work.modelName || '').startsWith(WORK_PREFIXES.videoShot)
}

export interface DetailBlockText {
  blockId: string
  label: string
  text: string
}

export interface DetailWorkPayload {
  productName: string
  blocks: DetailBlockText[]
  imageUrls: string[]
}

export function parseDetailPayload(raw: string): DetailWorkPayload | null {
  try {
    const parsed = JSON.parse(raw) as Partial<DetailWorkPayload>
    const blocks = Array.isArray(parsed.blocks)
      ? parsed.blocks.filter(
          (b): b is DetailBlockText => !!b && typeof b.label === 'string' && typeof b.text === 'string',
        )
      : []
    if (!blocks.length) return null
    return {
      productName: typeof parsed.productName === 'string' ? parsed.productName : '',
      blocks,
      imageUrls: Array.isArray(parsed.imageUrls)
        ? parsed.imageUrls.filter((u): u is string => typeof u === 'string' && /^https?:\/\//.test(u))
        : [],
    }
  } catch {
    return null
  }
}

export interface VideoShotText {
  shotNo: number
  visual: string
  dialogue: string
  duration: string
  music: string
}

export interface VideoShotRef {
  shotId: string
  shotNo: number
  url: string
}

export interface VideoSetWorkPayload {
  productName: string
  videoTypeId: string
  shots: VideoShotText[]
  videos: VideoShotRef[]
}

export function parseVideoSetPayload(raw: string): VideoSetWorkPayload | null {
  try {
    const parsed = JSON.parse(raw) as Partial<VideoSetWorkPayload> & {
      shots?: Array<Partial<VideoShotText> & { shotId?: string }>
    }
    const shots = Array.isArray(parsed.shots)
      ? parsed.shots
          .filter((s): s is NonNullable<typeof parsed.shots>[number] => !!s && typeof s.shotNo === 'number')
          .map((s) => ({
            shotNo: s.shotNo as number,
            visual: typeof s.visual === 'string' ? s.visual : '',
            dialogue: typeof s.dialogue === 'string' ? s.dialogue : '',
            duration: typeof s.duration === 'string' ? s.duration : '',
            music: typeof s.music === 'string' ? s.music : '',
          }))
      : []
    const videos = Array.isArray(parsed.videos)
      ? parsed.videos.filter(
          (v): v is VideoShotRef =>
            !!v && typeof v.shotId === 'string' && /^(https?:\/\/|\/api\/files\/)/.test(v.url || ''),
        )
      : []
    if (!shots.length && !videos.length) return null
    return {
      productName: typeof parsed.productName === 'string' ? parsed.productName : '',
      videoTypeId: typeof parsed.videoTypeId === 'string' ? parsed.videoTypeId : 'main-video',
      shots,
      videos,
    }
  } catch {
    return null
  }
}
