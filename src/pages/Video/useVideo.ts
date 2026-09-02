import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  callAigcAndPoll,
  resumeAigcJob,
  formatAigcFailureMessage,
  loadAigcHistory,
  previewAigcPrice,
  formatAigcPricePreview,
  uploadAigcMedia,
  listAigcModels,
  downloadAigcResult,
  isUsableMediaUrl,
} from '@/lib/aigc'
import type { AigcUsage, AigcModelInfo, AigcResult } from '@/lib/aigc'
import { callLlmWithFallback, listLlmModels, LLM_PROVIDER_NOT_CONFIGURED } from '@/lib/llm'
import type { LlmMessage, LlmModelInfo, LlmCallResult } from '@/lib/llm'
import { useCostConfirm } from '@/hooks/useCostConfirm'
import { applyPrefsToModels, loadPrefs } from '@/lib/modelPrefs'
import {
  loadLocalWorks,
  hydrateWorksFromCloud,
  onWorksChanged,
  appendLocalWork,
  toggleWorkSaved,
  removeLocalWorkById,
  persistLocalWorks,
  type LocalWork,
} from '@/lib/localWorks'
import { DEFAULT_LLM_MODEL, llmModelMetaOf } from '@/pages/Copywriting/useCopywriting'

export { llmModelMetaOf }

const POLL_INTERVAL_MS = 6000
const POLL_TIMEOUT_MS = 3600000
const VIDEO_LOCAL_PREFIX = 'video:'
const VIDEO_SHOT_PREFIX = 'video-shot:'
export const DEFAULT_ENGINE = 'seedance-1-5-pro-white'

export type UploadStatus = 'idle' | 'uploading' | 'done' | 'error'
export type ShotJobStatus = 'running' | 'success' | 'failed'

export interface VideoTypeDef {
  id: string
  label: string
  desc: string
}

export const VIDEO_TYPES: VideoTypeDef[] = [
  { id: 'main-video', label: '主圖視頻', desc: '約 15 秒，商品主圖位輪播展示' },
  { id: 'seed-video', label: '種草短視頻', desc: '社交平臺種草敘事，講場景講體驗' },
  { id: 'viral-video', label: '爆款口播復刻', desc: '復刻爆款口播的節奏與話術結構' },
]

// 引擎展示名與參考價（選擇器清單本身來自後端 GET /api/aigc/models，這裏只補展示文案）
export const ENGINE_META: Record<string, { displayName: string; priceHint: string }> = {}

export function engineMetaOf(modelName: string) {
  return ENGINE_META[modelName] ?? { displayName: modelName, priceHint: '按實際扣費' }
}

export const PARAM_LABELS: Record<string, string> = {
  resolution: '分辨率',
  duration: '時長（秒）',
  ratio: '畫面比例',
  generateAudio: '生成配音',
  enableAudio: '生成配音',
  realPersonMode: '真人出鏡模式',
  conversionSlots: '參與轉化的幀',
  returnLastFrame: '返回尾幀',
  seed: '隨機種子',
  shotType: '鏡頭模式',
  enablePromptExpansion: '提示詞擴寫',
}

export const OPTION_LABELS: Record<string, string> = {
  adaptive: '自適應',
  all: '首幀+尾幀',
  firstFrameUrl: '僅首幀',
  lastFrameUrl: '僅尾幀',
  single: '單鏡頭',
  multi: '多鏡頭',
  '-1': '自動',
}

export interface ShotCard {
  shotId: string
  shotNo: number
  visual: string
  dialogue: string
  duration: string
  music: string
  rewriteStatus: 'idle' | 'running' | 'failed'
}

export interface ShotFrame {
  url: string | null
  preview: string | null
  status: UploadStatus
  sourceLabel: string
}

export interface ShotVideoSlot {
  shotId: string
  label: string
  jobStatus: ShotJobStatus
  videoUrl: string | null
  taskId: string | null
  errorText: string | null
  usage: AigcUsage | null
  body: Record<string, unknown>
  engineName: string
}

export interface CandidateFrame {
  imageId: string
  url: string
  sourceLabel: string
}

export interface VideoHistoryPayload {
  productName: string
  videoTypeId: string
  llmModel: string
  shots: ShotCard[]
  videos: { shotId: string; shotNo: number; url: string }[]
}

export interface HistoryVideoItem {
  key: string
  productName: string
  videoTypeId: string
  timeLabel: string
  saved: boolean
  shotCount: number
  videoCount: number
  payload: VideoHistoryPayload
}

const SCRIPT_SYSTEM_PROMPT =
  '你是一位資深電商短視頻導演兼分鏡編劇，擅長把商品賣點寫成可直接拍攝、可直接做圖生視頻的分鏡腳本。嚴格按用戶要求的 JSON 格式輸出，不輸出任何解釋、前後綴或 markdown 代碼塊標記。'

const LLM_ERROR_ZH: Record<string, string> = {
  timeout: 'AI 生成超時（可能服務器繁忙），請稍後重試',
  not_found: '請求未能到達 AI，請檢查網絡後重試',
  login_required: '請先登錄後再生成',
  insufficient_balance: '賬戶餘額不足，請充值後重試',
}

function zhLlmError(res: LlmCallResult): string {
  if (res.error && LLM_ERROR_ZH[res.error]) return LLM_ERROR_ZH[res.error]
  return res.error || '生成失敗，請重試'
}

function formatTimeLabel(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function pickStr(v: unknown): string {
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  return ''
}

interface ParsedShot {
  visual: string
  dialogue: string
  duration: string
  music: string
}

function normalizeShot(obj: Record<string, unknown>): ParsedShot | null {
  const visual = pickStr(obj.visual ?? obj.frame ?? obj.scene ?? obj['畫面描述'])
  if (!visual.trim()) return null
  return {
    visual: visual.trim(),
    dialogue: pickStr(obj.dialogue ?? obj.subtitle ?? obj['臺詞'] ?? obj['字幕']).trim(),
    duration: pickStr(obj.duration ?? obj['時長']).trim() || '5秒',
    music: pickStr(obj.music ?? obj.bgm ?? obj['配樂建議'] ?? obj['配樂']).trim(),
  }
}

function extractJsonSegment(raw: string, open: string, close: string): string {
  let text = raw.trim()
  text = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim()
  const start = text.indexOf(open)
  const end = text.lastIndexOf(close)
  if (start >= 0 && end > start) return text.slice(start, end + 1)
  return text
}

function parseShotArray(raw: string): ParsedShot[] {
  try {
    const parsed = JSON.parse(extractJsonSegment(raw, '[', ']')) as unknown
    if (!Array.isArray(parsed)) return []
    const out: ParsedShot[] = []
    for (const item of parsed) {
      if (item && typeof item === 'object') {
        const n = normalizeShot(item as Record<string, unknown>)
        if (n) out.push(n)
      }
    }
    return out
  } catch {
    return []
  }
}

function parseShotObject(raw: string): ParsedShot | null {
  try {
    const parsed = JSON.parse(extractJsonSegment(raw, '{', '}')) as unknown
    if (parsed && typeof parsed === 'object') return normalizeShot(parsed as Record<string, unknown>)
    return null
  } catch {
    return null
  }
}

function parsePayload(raw: string): VideoHistoryPayload {
  try {
    const parsed = JSON.parse(raw) as Partial<VideoHistoryPayload>
    const shots = Array.isArray(parsed.shots)
      ? parsed.shots.filter(
          (s): s is ShotCard =>
            !!s && typeof s.shotId === 'string' && typeof s.visual === 'string' && typeof s.shotNo === 'number',
        )
      : []
    const videos = Array.isArray(parsed.videos)
      ? parsed.videos.filter(
          (v): v is VideoHistoryPayload['videos'][number] =>
            !!v && typeof v.shotId === 'string' && isUsableMediaUrl(v.url),
        )
      : []
    return {
      productName: typeof parsed.productName === 'string' ? parsed.productName : '',
      videoTypeId: typeof parsed.videoTypeId === 'string' ? parsed.videoTypeId : 'main-video',
      llmModel: typeof parsed.llmModel === 'string' ? parsed.llmModel : DEFAULT_LLM_MODEL,
      shots,
      videos,
    }
  } catch {
    return { productName: '', videoTypeId: 'main-video', llmModel: DEFAULT_LLM_MODEL, shots: [], videos: [] }
  }
}

function updateLocalWorkById(id: string, patch: Partial<LocalWork>): LocalWork[] {
  const next = loadLocalWorks().map(w => (w.id === id ? { ...w, ...patch } : w))
  persistLocalWorks(next)
  return next
}

export function useVideo() {
  const [searchParams, setSearchParams] = useSearchParams()
  // --- 商品信息表單 ---
  const [productName, setProductName] = useState('')
  const [sellingPoints, setSellingPoints] = useState('')
  const [videoTypeId, setVideoTypeId] = useState('main-video')
  const [styleNote, setStyleNote] = useState('')

  // --- 寫作模型（清單來自後端，不寫死單一模型） ---
  const [llmModelOptions, setLlmModelOptions] = useState<LlmModelInfo[]>([])
  const [modelsState, setModelsState] = useState<'loading' | 'ready' | 'unconfigured'>('loading')
  const [selectedLlmModel, setSelectedLlmModel] = useState(DEFAULT_LLM_MODEL)

  // --- 分鏡腳本 ---
  const [shots, setShots] = useState<ShotCard[]>([])
  const [scriptJobStatus, setScriptJobStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle')
  const [scriptError, setScriptError] = useState<string | null>(null)

  // --- 鏡頭視頻：勾選 + 首幀 ---
  const [selectedShotIds, setSelectedShotIds] = useState<string[]>([])
  const [shotFrames, setShotFrames] = useState<Record<string, ShotFrame>>({})
  // 從「我的作品」繼續加工跳轉帶入的首幀候選圖（?src=），可在鏡頭區一鍵應用到全部鏡頭
  const [pendingFrameUrl, setPendingFrameUrl] = useState<string | null>(null)

  // --- 生視頻引擎（清單來自後端，不寫死單一引擎） ---
  const [engineOptions, setEngineOptions] = useState<AigcModelInfo[]>([])
  const [selectedEngine, setSelectedEngine] = useState(DEFAULT_ENGINE)
  const [engineParamValues, setEngineParamValues] = useState<Record<string, string>>({})

  // --- 逐鏡視頻結果（併發，逐項狀態） ---
  const [shotVideos, setShotVideos] = useState<ShotVideoSlot[]>([])

  // --- 提示 / 錯誤 ---
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [needsLogin, setNeedsLogin] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // --- 本地歷史（未登錄可用） ---
  const [localWorks, setLocalWorks] = useState<LocalWork[]>([])

  // 作品歷史以雲端為準：進頁時灌回，並訂閱後續變動。
  useEffect(() => {
    void hydrateWorksFromCloud().then(setLocalWorks)
    return onWorksChanged(() => setLocalWorks(loadLocalWorks()))
  }, [])

  const [savedAll, setSavedAll] = useState(false)
  const lastHistoryIdRef = useRef<string | null>(null)

  // --- 價格預估 ---
  // 三態徽標: priceLoading?'預估中':(priceText||'按實際扣費')
  // 禁止 View 用 `priceText || '費用預估中'` —— 失敗/空價會被誤當成一直在加載。
  const [priceText, setPriceText] = useState<string | null>(null)
  const [priceLoading, setPriceLoading] = useState(false)
  const priceDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // --- 計費確認 ---
  const costConfirm = useCostConfirm()

  // 從「我的作品」繼續加工跳轉（帶 ?src= 圖）：記爲首幀候選，等分鏡生成後可一鍵設爲全部鏡頭首幀
  useEffect(() => {
    const src = searchParams.get('src')
    if (!src) return
    setSearchParams({}, { replace: true })
    setPendingFrameUrl(src)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const works = loadLocalWorks()
    setLocalWorks(works)
    listLlmModels().then(async list => {
      if (!list.length) { setModelsState('unconfigured'); setErrorMsg(LLM_PROVIDER_NOT_CONFIGURED); return }
      // 應用全站引擎設置（寫作組）：過濾停用引擎 + 默認引擎排最前
      const prefs = await loadPrefs()
      const visible = applyPrefsToModels(list, 'writing', prefs)
      if (!visible.length) { setModelsState('unconfigured'); setErrorMsg(LLM_PROVIDER_NOT_CONFIGURED); return }
      setModelsState('ready')
      setLlmModelOptions(visible)
      setSelectedLlmModel(prev => (visible.some(m => m.model === prev) ? prev : visible[0].model))
    })
    listAigcModels().then(async list => {
      const videoModels = list.filter(m => m.output_type === 'video')
      if (videoModels.length) {
        // 應用全站引擎設置（生視頻組）：過濾停用引擎 + 默認引擎排最前
        const prefs = await loadPrefs()
        const visible = applyPrefsToModels(videoModels, 'video-gen', prefs)
        const pool = visible.length ? visible : videoModels
        setEngineOptions(pool)
        setSelectedEngine(prev => (pool.some(m => m.model === prev) ? prev : pool[0].model))
        // 刷新 / 重進頁面後，把各引擎上進行中的任務續跑回來（續跑不受引擎停用影響）
        videoModels.forEach(m => {
          loadAigcHistory(m.model, { page: 1, perPage: 8 })
            .then(items => {
              items
                ?.filter(it => it.status === 'running')
                .forEach(it => resumePollingJob(it.jobId, it.model || m.model))
            })
            .catch(() => {})
        })
      }
    })
    // 自動回看最近一次整套記錄
    const latest = works.find(w => w.modelName.startsWith(VIDEO_LOCAL_PREFIX))
    if (latest) restoreFromPayload(parsePayload(latest.url), latest.id, true)
  }, [])

  // 切換引擎時按該引擎契約重置參數默認值
  useEffect(() => {
    const info = engineOptions.find(m => m.model === selectedEngine)
    if (!info) return
    const next: Record<string, string> = {}
    for (const p of info.scalar_params ?? []) {
      if (typeof p.default === 'string') next[p.name] = p.default
      else if (typeof p.default === 'boolean') next[p.name] = String(p.default)
      else if (typeof p.default === 'number') next[p.name] = String(p.default)
      else if (p.enum && p.enum.length) next[p.name] = p.enum[0]
    }
    setEngineParamValues(next)
  }, [selectedEngine, engineOptions])

  // 引擎 / 參數變化 → 防抖價格預估（formatAigcPricePreview 兼容只回 estimatedPrice 的響應）
  useEffect(() => {
    if (!selectedEngine) return
    if (priceDebounceRef.current) clearTimeout(priceDebounceRef.current)
    setPriceLoading(true)
    priceDebounceRef.current = setTimeout(async () => {
      try {
        const r = await previewAigcPrice(selectedEngine, { ...engineParamValues, prompt: '電商商品鏡頭' })
        setPriceText(formatAigcPricePreview(r))
      } catch {
        setPriceText(null)
      } finally {
        setPriceLoading(false)
      }
    }, 500)
    return () => {
      if (priceDebounceRef.current) clearTimeout(priceDebounceRef.current)
    }
  }, [selectedEngine, engineParamValues])

  function showToast(msg: string) {
    setToast(msg)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 2600)
  }

  // ---------------- 平臺任務斷點續跑 ----------------

  async function resumePollingJob(jobId: string, modelName: string) {
    try {
      const res = await resumeAigcJob(
        { jobId, model: modelName },
        { pollIntervalMs: POLL_INTERVAL_MS, deadlineMs: POLL_TIMEOUT_MS },
      )
      if (res.status === 'success') {
        const outs = res.outputs || []
        const url = res.url || outs[0]?.url || ''
        if (url) {
          setShotVideos(prev => [
            {
              shotId: `resumed-${jobId}`,
              label: '續跑任務',
              jobStatus: 'success',
              videoUrl: url,
              taskId: res.taskId || jobId,
              errorText: null,
              usage: res.usage || null,
              body: {},
              engineName: modelName,
            },
            ...prev,
          ])
        }
      } else if (res.needsLogin || res.errorKind === 'login_required') {
        setNeedsLogin(true)
      }
    } catch {
      // 續跑失敗不打斷主鏈路
    }
  }

  // ---------------- 分鏡腳本（LLM） ----------------

  function buildScriptMessages(): LlmMessage[] {
    const typeDef = VIDEO_TYPES.find(t => t.id === videoTypeId) ?? VIDEO_TYPES[0]
    const lines = [
      `請爲下面的商品寫一支「${typeDef.label}」的完整分鏡腳本。`,
      `商品名稱：${productName.trim()}`,
      `核心賣點：${sellingPoints.trim()}`,
    ]
    if (styleNote.trim()) lines.push(`風格補充：${styleNote.trim()}`)
    if (typeDef.id === 'main-video') lines.push('總時長控制在 15 秒左右。')
    lines.push(
      '要求：',
      '- 5-7 個鏡頭，鏡頭之間敘事連貫',
      '- 每鏡包含：鏡號、畫面描述、臺詞/字幕、時長、配樂建議',
      '- 畫面描述要具體可見（主體、動作、場景、鏡頭運動、光影），能直接拿去生成視頻',
      '- 嚴格輸出 JSON 數組，每個元素字段：shotNo(數字)、visual(畫面描述)、dialogue(臺詞/字幕)、duration(時長，如"3秒")、music(配樂建議)',
      '- 只輸出 JSON 數組本身，不要任何其他文字',
    )
    return [
      { role: 'system', content: SCRIPT_SYSTEM_PROMPT },
      { role: 'user', content: lines.join('\n') },
    ]
  }

  function createSetRecord(cards: ShotCard[], llmModel: string): string {
    const workId = `video-${Date.now()}`
    const payload: VideoHistoryPayload = {
      productName: productName.trim(),
      videoTypeId,
      llmModel,
      shots: cards,
      videos: [],
    }
    const work: LocalWork = {
      id: workId,
      url: JSON.stringify(payload),
      createdIso: new Date().toISOString(),
      modeLabel: '視頻腳本',
      modelName: `${VIDEO_LOCAL_PREFIX}${llmModel}`,
      prompt: productName.trim(),
      taskId: null,
    }
    setLocalWorks(appendLocalWork(work))
    return workId
  }

  // 把某鏡頭的視頻結果合併進當前整套歷史記錄
  function mergeVideoIntoRecord(video: { shotId: string; shotNo: number; url: string }) {
    const recordId = lastHistoryIdRef.current
    if (!recordId) return
    const works = loadLocalWorks()
    const record = works.find(w => w.id === recordId)
    if (!record) return
    const payload = parsePayload(record.url)
    const others = payload.videos.filter(v => v.shotId !== video.shotId)
    const nextPayload = { ...payload, videos: [...others, video] }
    setLocalWorks(updateLocalWorkById(recordId, { url: JSON.stringify(nextPayload) }))
  }

  async function runScriptGeneration() {
    const llmModel = selectedLlmModel
    setScriptJobStatus('running')
    setScriptError(null)
    setErrorMsg(null)
    const res = await callLlmWithFallback(llmModel, { messages: buildScriptMessages(), page: 'video' })
    if (res.status === 'success' && res.text) {
      const parsed = parseShotArray(res.text)
      if (!parsed.length) {
        setScriptJobStatus('failed')
        setScriptError('沒能識別出分鏡內容，請再試一次')
        return
      }
      const cards: ShotCard[] = parsed.map((s, i) => ({
        shotId: `shot-${Date.now()}-${i}`,
        shotNo: i + 1,
        visual: s.visual,
        dialogue: s.dialogue,
        duration: s.duration,
        music: s.music,
        rewriteStatus: 'idle',
      }))
      setShots(cards)
      setSelectedShotIds([])
      setShotFrames({})
      setShotVideos([])
      setSavedAll(false)
      setScriptJobStatus('success')
      lastHistoryIdRef.current = createSetRecord(cards, llmModel)
      showToast(`分鏡腳本寫好啦，共 ${cards.length} 個鏡頭`)
    } else {
      if (res.needsLogin) setNeedsLogin(true)
      const detail = zhLlmError(res)
      setScriptJobStatus('failed')
      setScriptError(detail)
      setErrorMsg(detail)
    }
  }

  function handleGenerateScript() {
    if (!canGenerateScript) return
    costConfirm.runWithCostConfirm(runScriptGeneration, '生成一套完整分鏡腳本，按實際 token 消耗扣費')
  }

  async function runRewriteShot(shot: ShotCard) {
    setShots(prev => prev.map(s => (s.shotId === shot.shotId ? { ...s, rewriteStatus: 'running' } : s)))
    const messages: LlmMessage[] = [
      { role: 'system', content: SCRIPT_SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          `請把下面這個分鏡改寫一版：畫面更有表現力、臺詞更抓人，時長保持不變。`,
          `原畫面描述：${shot.visual}`,
          `原臺詞/字幕：${shot.dialogue || '（無臺詞）'}`,
          `原時長：${shot.duration}`,
          '嚴格輸出一個 JSON 對象，字段：visual、dialogue、duration、music。只輸出 JSON 對象本身。',
        ].join('\n'),
      },
    ]
    const res = await callLlmWithFallback(selectedLlmModel, { messages, page: 'video' })
    if (res.status === 'success' && res.text) {
      const parsed = parseShotObject(res.text)
      if (parsed) {
        setShots(prev =>
          prev.map(s =>
            s.shotId === shot.shotId
              ? { ...s, visual: parsed.visual, dialogue: parsed.dialogue, duration: parsed.duration, music: parsed.music, rewriteStatus: 'idle' }
              : s,
          ),
        )
        showToast('已爲你改寫一版')
        return
      }
    }
    if (res.status !== 'success' && res.needsLogin) setNeedsLogin(true)
    setShots(prev => prev.map(s => (s.shotId === shot.shotId ? { ...s, rewriteStatus: 'failed' } : s)))
    setErrorMsg(zhLlmError(res))
  }

  function handleRewriteShot(shotId: string) {
    const shot = shots.find(s => s.shotId === shotId)
    if (!shot || shot.rewriteStatus === 'running') return
    costConfirm.runWithCostConfirm(() => {
      void runRewriteShot(shot)
    }, '改寫一個鏡頭，按實際 token 消耗扣費')
  }

  function handleDeleteShot(shotId: string) {
    setShots(prev => {
      const next = prev.filter(s => s.shotId !== shotId).map((s, i) => ({ ...s, shotNo: i + 1 }))
      return next
    })
    setSelectedShotIds(prev => prev.filter(id => id !== shotId))
    setShotVideos(prev => prev.filter(v => v.shotId !== shotId))
  }

  function handleExportScript() {
    if (!shots.length) {
      showToast('還沒有可導出的分鏡腳本')
      return
    }
    const typeDef = VIDEO_TYPES.find(t => t.id === videoTypeId) ?? VIDEO_TYPES[0]
    const head = `《${productName.trim() || '未命名商品'}》${typeDef.label} 分鏡腳本`
    const body = shots
      .map(s =>
        [
          `鏡頭 ${s.shotNo}（${s.duration}）`,
          `畫面：${s.visual}`,
          s.dialogue ? `臺詞/字幕：${s.dialogue}` : '',
          s.music ? `配樂建議：${s.music}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      )
      .join('\n\n')
    navigator.clipboard
      ?.writeText(`${head}\n\n${body}`)
      .then(() => showToast('整套分鏡腳本已複製到剪貼板'))
      .catch(() => showToast('複製失敗，請手動選擇文案複製'))
  }

  // ---------------- 鏡頭視頻：勾選 / 首幀 ----------------

  function handleToggleShot(shotId: string) {
    setSelectedShotIds(prev => (prev.includes(shotId) ? prev.filter(id => id !== shotId) : [...prev, shotId]))
  }

  function handlePickFrame(shotId: string, img: CandidateFrame) {
    setShotFrames(prev => ({
      ...prev,
      [shotId]: { url: img.url, preview: img.url, status: 'done', sourceLabel: img.sourceLabel },
    }))
  }

  function handleApplyPendingFrameToAll() {
    if (!pendingFrameUrl || !shots.length) return
    setShotFrames(() => {
      const next: Record<string, ShotFrame> = {}
      for (const s of shots) {
        next[s.shotId] = { url: pendingFrameUrl, preview: pendingFrameUrl, status: 'done', sourceLabel: '我的作品' }
      }
      return next
    })
    setPendingFrameUrl(null)
    showToast('已把作品圖設爲全部鏡頭首幀')
  }

  async function handleUploadFrame(shotId: string, file: File | null) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showToast('只支持圖片文件')
      return
    }
    const previewUrl = URL.createObjectURL(file)
    setShotFrames(prev => ({
      ...prev,
      [shotId]: { url: null, preview: previewUrl, status: 'uploading', sourceLabel: '本地上傳' },
    }))
    try {
      const r = await uploadAigcMedia(file, 'image')
      const url = typeof r === 'string' ? r : r.ok ? r.downloadUrl || r.download_url || '' : ''
      if (url) {
        setShotFrames(prev => ({
          ...prev,
          [shotId]: { url, preview: previewUrl, status: 'done', sourceLabel: '本地上傳' },
        }))
      } else {
        setShotFrames(prev => ({ ...prev, [shotId]: { url: null, preview: previewUrl, status: 'error', sourceLabel: '本地上傳' } }))
        showToast('圖片上傳失敗，請重試')
      }
    } catch {
      setShotFrames(prev => ({ ...prev, [shotId]: { url: null, preview: previewUrl, status: 'error', sourceLabel: '本地上傳' } }))
      showToast('圖片上傳失敗，請重試')
    }
  }

  // ---------------- 鏡頭視頻：併發生成 ----------------

  const selectedEngineInfo = engineOptions.find(m => m.model === selectedEngine) ?? null

  function buildShotBody(engineInfo: AigcModelInfo, shot: ShotCard, frameUrl: string): Record<string, unknown> {
    const body: Record<string, unknown> = {
      prompt: `${shot.visual}。鏡頭運動自然流暢，光影真實，商業短視頻質感。`,
    }
    for (const p of engineInfo.scalar_params ?? []) {
      let val = engineParamValues[p.name] ?? ''
      if (val === '' && typeof p.default === 'string') val = p.default
      else if (val === '' && typeof p.default === 'boolean') val = String(p.default)
      else if (val === '' && typeof p.default === 'number') val = String(p.default)
      else if (val === '' && p.enum && p.enum.length) val = p.enum[0]
      if (val !== '') body[p.name] = val
    }
    const mediaParam = (engineInfo.media_params ?? []).find(m => m.type === 'image' && m.required)
    // Video API accepts imageUrls as String[]; do not send the selected first-frame URL as a scalar.
    body[mediaParam ? mediaParam.name : 'imageUrls'] = [frameUrl]
    return body
  }

  function applyShotVideoOutcome(
    shotId: string,
    res: AigcResult,
    shotNo: number,
    engineName: string,
  ) {
    if (res.status === 'success') {
      const outs = res.outputs || []
      const url = res.url || outs[0]?.url || ''
      setShotVideos(prev =>
        prev.map(v =>
          v.shotId === shotId ? { ...v, jobStatus: 'success', videoUrl: url, taskId: res.taskId || null, usage: res.usage || null } : v,
        ),
      )
      if (url) {
        mergeVideoIntoRecord({ shotId, shotNo, url })
        const work: LocalWork = {
          id: `${shotId}-video`,
          url,
          createdIso: new Date().toISOString(),
          modeLabel: `視頻腳本 · 鏡頭 ${shotNo}`,
          modelName: `${VIDEO_SHOT_PREFIX}${engineName}`,
          prompt: productName.trim(),
          taskId: res.taskId || null,
        }
        setLocalWorks(appendLocalWork(work))
      }
    } else {
      if (res.needsLogin || res.errorKind === 'login_required') setNeedsLogin(true)
      const detail = formatAigcFailureMessage(res)
      setShotVideos(prev => prev.map(v => (v.shotId === shotId ? { ...v, jobStatus: 'failed', errorText: detail } : v)))
      setErrorMsg(detail)
    }
  }

  async function runVideoBatch() {
    const engineInfo = selectedEngineInfo
    if (!engineInfo) return
    const plans = shots.filter(s => {
      const frame = shotFrames[s.shotId]
      return selectedShotIds.includes(s.shotId) && frame?.url && frame.status === 'done'
    })
    if (!plans.length) return
    const engineName = selectedEngine
    const stamped: ShotVideoSlot[] = plans.map(shot => ({
      shotId: shot.shotId,
      label: `鏡頭 ${shot.shotNo}`,
      jobStatus: 'running',
      videoUrl: null,
      taskId: null,
      errorText: null,
      usage: null,
      body: buildShotBody(engineInfo, shot, shotFrames[shot.shotId].url as string),
      engineName,
    }))
    setShotVideos(stamped)
    setErrorMsg(null)

    await Promise.all(
      stamped.map(async (slot, i) => {
        if (i > 0) await new Promise(r => setTimeout(r, i * 500))
        const shot = plans.find(s => s.shotId === slot.shotId)
        const res = await callAigcAndPoll(engineName, slot.body, {
          pollIntervalMs: POLL_INTERVAL_MS,
          deadlineMs: POLL_TIMEOUT_MS,
        })
        applyShotVideoOutcome(slot.shotId, res, shot?.shotNo ?? i + 1, engineName)
      }),
    )
    showToast('本輪鏡頭視頻生成完成')
  }

  function handleGenerateVideos() {
    if (!canGenerateVideos) return
    const readyCount = selectedShotIds.length
    const displayPrice = priceText ? `${priceText} × ${readyCount} 個鏡頭` : '按 AI provider 實際扣費'
    costConfirm.runWithCostConfirm(runVideoBatch, displayPrice)
  }

  async function runRetryShotVideo(shotId: string) {
    const slot = shotVideos.find(v => v.shotId === shotId)
    if (!slot || slot.jobStatus === 'running' || !slot.body || Object.keys(slot.body).length === 0) return
    setShotVideos(prev => prev.map(v => (v.shotId === shotId ? { ...v, jobStatus: 'running', errorText: null } : v)))
    const res = await callAigcAndPoll(slot.engineName, slot.body, {
      pollIntervalMs: POLL_INTERVAL_MS,
      deadlineMs: POLL_TIMEOUT_MS,
    })
    const shot = shots.find(s => s.shotId === shotId)
    applyShotVideoOutcome(shotId, res, shot?.shotNo ?? 0, slot.engineName)
  }

  function handleRetryShotVideo(shotId: string) {
    const slot = shotVideos.find(v => v.shotId === shotId)
    if (!slot || slot.jobStatus === 'running') return
    costConfirm.runWithCostConfirm(() => {
      void runRetryShotVideo(shotId)
    }, priceText || '按 AI provider 實際扣費')
  }

  function handleDownloadVideo(url: string) {
    void downloadAigcResult(url)
  }

  function handleSelectLlmModel(modelName: string) {
    setSelectedLlmModel(modelName)
  }

  function handleSelectEngine(modelName: string) {
    setSelectedEngine(modelName)
  }

  function handleEngineParamChange(name: string, value: string) {
    setEngineParamValues(prev => ({ ...prev, [name]: value }))
  }

  // ---------------- 保存整套 + 歷史 ----------------

  function restoreFromPayload(payload: VideoHistoryPayload, recordId: string, silent = false) {
    setProductName(payload.productName)
    if (VIDEO_TYPES.some(t => t.id === payload.videoTypeId)) setVideoTypeId(payload.videoTypeId)
    if (payload.llmModel) setSelectedLlmModel(payload.llmModel)
    setShots(payload.shots.map(s => ({ ...s, rewriteStatus: 'idle' as const })))
    setScriptJobStatus(payload.shots.length ? 'success' : 'idle')
    setScriptError(null)
    setSelectedShotIds(payload.videos.map(v => v.shotId))
    setShotFrames({})
    setShotVideos(
      payload.videos
        .filter(v => payload.shots.some(s => s.shotId === v.shotId))
        .map(v => ({
          shotId: v.shotId,
          label: `鏡頭 ${v.shotNo}`,
          jobStatus: 'success' as ShotJobStatus,
          videoUrl: v.url,
          taskId: null,
          errorText: null,
          usage: null,
          body: {},
          engineName: '',
        })),
    )
    lastHistoryIdRef.current = recordId
    setSavedAll(false)
    setErrorMsg(null)
    if (!silent) showToast('已打開歷史記錄')
  }

  function handleSaveAll() {
    const targetId = lastHistoryIdRef.current
    if (!targetId || savedAll) return
    setLocalWorks(toggleWorkSaved(targetId))
    setSavedAll(true)
    showToast('整套腳本和視頻已保存到我的作品')
  }

  const videoHistory = useMemo<HistoryVideoItem[]>(
    () =>
      localWorks
        .filter(w => w.modelName.startsWith(VIDEO_LOCAL_PREFIX))
        .map(w => {
          const payload = parsePayload(w.url)
          return {
            key: w.id,
            productName: payload.productName || w.prompt,
            videoTypeId: payload.videoTypeId,
            timeLabel: formatTimeLabel(w.createdIso),
            saved: !!w.saved,
            shotCount: payload.shots.length,
            videoCount: payload.videos.length,
            payload,
          }
        }),
    [localWorks],
  )

  function handleShowHistory(item: HistoryVideoItem) {
    restoreFromPayload(item.payload, item.key)
  }

  function handleRemoveHistory(key: string) {
    setLocalWorks(removeLocalWorkById(key))
    if (lastHistoryIdRef.current === key) {
      lastHistoryIdRef.current = null
      setSavedAll(false)
    }
    showToast('已刪除該記錄')
  }

  // 「我的作品」裏其它頁面生成的圖片（排除文案/詳情頁/視頻記錄）
  const candidateFrames = useMemo<CandidateFrame[]>(
    () =>
      localWorks
        .filter(
          w =>
            isUsableMediaUrl(w.url) &&
            !w.modelName.startsWith('llm:') &&
            !w.modelName.startsWith('detail:') &&
            !w.modelName.startsWith(VIDEO_LOCAL_PREFIX) &&
            !w.modelName.startsWith(VIDEO_SHOT_PREFIX),
        )
        .map(w => ({ imageId: w.id, url: w.url, sourceLabel: w.modeLabel })),
    [localWorks],
  )

  // ---------------- 派生狀態 ----------------

  const isScriptRunning = scriptJobStatus === 'running'
  const canGenerateScript =
    productName.trim().length > 0 && sellingPoints.trim().length > 0 && !isScriptRunning

  const isVideoGenerating = shotVideos.some(v => v.jobStatus === 'running')
  const selectedShots = shots.filter(s => selectedShotIds.includes(s.shotId))
  const readyShotCount = selectedShots.filter(s => {
    const frame = shotFrames[s.shotId]
    return !!frame?.url && frame.status === 'done'
  }).length
  const canGenerateVideos =
    selectedShots.length > 0 && readyShotCount === selectedShots.length && !isVideoGenerating && !!selectedEngineInfo

  const hasShotStudio = shots.length > 0

  return {
    // 表單
    productName, setProductName,
    sellingPoints, setSellingPoints,
    videoTypeId, setVideoTypeId,
    styleNote, setStyleNote,
    // 寫作模型（可配置清單，不寫死）
    llmModelOptions, selectedLlmModel, handleSelectLlmModel, modelsState,
    // 分鏡腳本
    shots, scriptJobStatus, scriptError,
    canGenerateScript, isScriptRunning, handleGenerateScript,
    handleRewriteShot, handleDeleteShot, handleExportScript,
    // 鏡頭視頻
    selectedShotIds, handleToggleShot,
    shotFrames, candidateFrames, handlePickFrame, handleUploadFrame,
    pendingFrameUrl, handleApplyPendingFrameToAll,
    // 引擎（可配置清單，不寫死）
    engineOptions, selectedEngine, selectedEngineInfo, handleSelectEngine,
    engineParamValues, handleEngineParamChange,
    // 生成與結果
    isVideoGenerating, canGenerateVideos, readyShotCount,
    handleGenerateVideos, shotVideos, handleRetryShotVideo, handleDownloadVideo,
    hasShotStudio,
    // 保存 + 歷史
    savedAll, handleSaveAll,
    videoHistory, handleShowHistory, handleRemoveHistory,
    // 提示 / 錯誤
    errorMsg, setErrorMsg, toast, needsLogin, setNeedsLogin,
    // 價格 + 計費確認
    priceText, priceLoading,
    ...costConfirm,
  }
}
