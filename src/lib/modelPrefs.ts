// 全站引擎偏好（模型設置頁的數據層）。
// - 登錄用戶：設置存雲端業務表 engine_settings（經 __pb 代理的自定義路由），換設備登錄同一套配置
// - 未登錄：設置存本機（localStorage 只在本文件內出現，頁面源碼不直接碰）
// - applyPrefsToModels(models, group)：各頁引擎清單的統一過濾入口——按能力分組歸類、
//   過濾被停用的引擎、把該組默認引擎排到最前。
import { getPocketBaseUrl } from '@/lib/pb'
import { getLocalAccount, onLocalAccountChange, localAuthHeaders } from '@/lib/localAuth'
import type { AigcModelInfo } from '@/lib/aigc'

// 四個能力分組：生圖/修圖、生視頻、圖像放大（以上來自 aigc 清單）、寫作（來自 llm 清單）
export type AigcPrefGroup = 'image-edit' | 'video-gen' | 'upscale'
export type PrefGroup = AigcPrefGroup | 'writing'

export const PREF_GROUPS: PrefGroup[] = ['image-edit', 'video-gen', 'upscale', 'writing']

export interface ModelPrefsData {
  aigc_defaults: Record<string, string>
  llm_defaults: Record<string, string>
  aigc_disabled: string[]
  llm_disabled: string[]
}

// 出廠默認引擎（恢復默認與各頁回退兜底用；清單本身永遠來自後端接口，不寫死）
export const FACTORY_DEFAULTS: Record<PrefGroup, string> = {
  'image-edit': 'seedream-4.5-white',
  'video-gen': 'seedance-1-5-pro-white',
  upscale: '',
  writing: 'gpt-5.5',
}

const LOCAL_KEY = 'stc.engine_settings.v1'

interface EngineSettingsRow {
  id: string
  user_id: string
  aigc_defaults?: Record<string, string> | null
  llm_defaults?: Record<string, string> | null
  aigc_disabled?: string[] | null
  llm_disabled?: string[] | null
}

export function defaultPrefs(): ModelPrefsData {
  return { aigc_defaults: {}, llm_defaults: {}, aigc_disabled: [], llm_disabled: [] }
}

function asStringRecord(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'string' && v) out[k] = v
  }
  return out
}

function asStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((v): v is string => typeof v === 'string' && v.length > 0)
}

function normalizePrefs(raw: Partial<Record<keyof ModelPrefsData, unknown>> | null | undefined): ModelPrefsData {
  return {
    aigc_defaults: asStringRecord(raw?.aigc_defaults),
    llm_defaults: asStringRecord(raw?.llm_defaults),
    aigc_disabled: asStringArray(raw?.aigc_disabled),
    llm_disabled: asStringArray(raw?.llm_disabled),
  }
}

// ---------------- 本機讀寫（僅本文件接觸 localStorage） ----------------

function readLocalPrefs(): ModelPrefsData {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY)
    if (!raw) return defaultPrefs()
    return normalizePrefs(JSON.parse(raw))
  } catch {
    return defaultPrefs()
  }
}

function writeLocalPrefs(prefs: ModelPrefsData): void {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(prefs))
  } catch {
    // 本機寫入失敗（隱私模式等）不阻塞頁面，設置僅留在內存裏
  }
}

// ---------------- 雲端讀寫（engine_settings 自定義路由） ----------------

let cloudRowId: string | null = null

async function fetchCloudRows(userId: string): Promise<EngineSettingsRow[]> {
  const url = `${getPocketBaseUrl()}/api/engine_settings?user_id=${encodeURIComponent(userId)}&perPage=50`
  const res = await fetch(url, { headers: { ...localAuthHeaders() } })
  if (!res.ok) throw new Error(`engine settings load failed: ${res.status}`)
  const data = (await res.json().catch(() => ({}))) as { items?: EngineSettingsRow[] }
  return Array.isArray(data.items) ? data.items : []
}

async function createCloudRow(userId: string, prefs: ModelPrefsData): Promise<string | null> {
  const res = await fetch(`${getPocketBaseUrl()}/api/engine_settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...localAuthHeaders() },
    body: JSON.stringify({ user_id: userId, ...prefs }),
  })
  if (!res.ok) throw new Error(`engine settings create failed: ${res.status}`)
  const row = (await res.json().catch(() => ({}))) as { id?: string }
  return row.id ?? null
}

async function patchCloudRow(rowId: string, prefs: ModelPrefsData): Promise<void> {
  const res = await fetch(`${getPocketBaseUrl()}/api/engine_settings/${encodeURIComponent(rowId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...localAuthHeaders() },
    body: JSON.stringify({
      aigc_defaults: prefs.aigc_defaults,
      llm_defaults: prefs.llm_defaults,
      aigc_disabled: prefs.aigc_disabled,
      llm_disabled: prefs.llm_disabled,
    }),
  })
  if (!res.ok) throw new Error(`engine settings update failed: ${res.status}`)
}

// ---------------- 統一讀取（登錄讀雲端，未登錄讀本機） ----------------

let cachedPrefs: ModelPrefsData | null = null
let inflight: Promise<ModelPrefsData> | null = null

async function doLoadPrefs(): Promise<ModelPrefsData> {
  const account = getLocalAccount()
  if (account) {
    try {
      const rows = await fetchCloudRows(account.id)
      if (rows.length) {
        cloudRowId = rows[0].id
        const prefs = normalizePrefs(rows[0])
        writeLocalPrefs(prefs) // 本機留一份鏡像，離線/未登錄回看時兜底
        return prefs
      }
      // 雲端還沒有記錄：用本機設置上雲（登錄後自動同步）
      const local = cachedPrefs ?? readLocalPrefs()
      cloudRowId = await createCloudRow(account.id, local)
      return local
    } catch {
      // 雲端暫時不可達時退回本機，設置頁仍可用
      return readLocalPrefs()
    }
  }
  cloudRowId = null
  return readLocalPrefs()
}

export function loadPrefs(force = false): Promise<ModelPrefsData> {
  if (cachedPrefs && !force) return Promise.resolve(cachedPrefs)
  if (inflight) return inflight
  inflight = doLoadPrefs()
    .then(prefs => {
      cachedPrefs = prefs
      return prefs
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

// 保存：本機總是落一份；登錄用戶同步雲端。雲端失敗會 throw，由頁面給出產品語提示。
export async function savePrefs(prefs: ModelPrefsData): Promise<void> {
  const next = normalizePrefs(prefs)
  cachedPrefs = next
  writeLocalPrefs(next)
  const account = getLocalAccount()
  if (!account) return
  try {
    if (cloudRowId) {
      await patchCloudRow(cloudRowId, next)
    } else {
      cloudRowId = await createCloudRow(account.id, next)
    }
  } catch (err) {
    cloudRowId = null
    throw err
  }
}

// 登錄態變化時清緩存：登錄後重新拉雲端（雲端優先），退出後回到本機
onLocalAccountChange(() => {
  cachedPrefs = null
  cloudRowId = null
  inflight = null
})

// ---------------- 分組歸類（按契約特徵，不寫死 slug 白名單） ----------------

// aigc 模型歸類：視頻輸出 → 生視頻；帶 prompt 指令輸入的圖像模型 → 生圖/修圖；
// 無 prompt、單圖進單圖出的圖像模型 → 圖像放大。無法歸類返回 null。
export function groupOfAigcModel(info: AigcModelInfo): AigcPrefGroup | null {
  if (info.output_type === 'video') return 'video-gen'
  if (info.output_type !== 'image') return null
  if (info.primary_input?.name === 'prompt') return 'image-edit'
  const media = info.media_params ?? []
  if (media.length === 1 && media[0].type === 'image' && !media[0].multiple) return 'upscale'
  return null
}

export function groupDefaultModel(group: PrefGroup, prefs?: ModelPrefsData | null): string {
  const p = prefs ?? cachedPrefs ?? defaultPrefs()
  if (group === 'writing') return p.llm_defaults?.writing || FACTORY_DEFAULTS.writing
  return p.aigc_defaults?.[group] || FACTORY_DEFAULTS[group]
}

// 各頁引擎清單的統一過濾：歸類到目標分組 → 過濾停用引擎 → 默認引擎排最前。
// 停用過濾若清空清單則回退到整組（防禦：任何頁面都不至於沒有可選引擎）。
export function applyPrefsToModels<T extends { model: string }>(
  models: T[],
  group: PrefGroup,
  prefs?: ModelPrefsData | null,
): T[] {
  const p = prefs ?? cachedPrefs ?? defaultPrefs()
  const pool =
    group === 'writing'
      ? [...models]
      : models.filter(m => groupOfAigcModel(m as unknown as AigcModelInfo) === group)
  const disabledList = group === 'writing' ? p.llm_disabled : p.aigc_disabled
  const disabled = new Set(disabledList)
  let visible = pool.filter(m => !disabled.has(m.model))
  if (!visible.length) visible = [...pool]
  const def = groupDefaultModel(group, p)
  const idx = visible.findIndex(m => m.model === def)
  if (idx > 0) {
    return [visible[idx], ...visible.slice(0, idx), ...visible.slice(idx + 1)]
  }
  return visible
}
