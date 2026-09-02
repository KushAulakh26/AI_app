import { useState, useEffect, useMemo, useRef } from 'react'
import {
  callAigcAndPoll,
  resumeAigcJob,
  formatAigcFailureMessage,
  loadAigcHistory,
  updateAigcHistoryItem,
  deleteAigcHistoryItem,
  previewAigcPrice,
  formatAigcPricePreview,
  uploadAigcMedia,
  listAigcModels,
  downloadAigcResult,
} from '@/lib/aigc'
import type { AigcResult, AigcUsage, AigcHistoryItem, AigcHistoryPatch, AigcModelInfo } from '@/lib/aigc'
import { useCostConfirm } from '@/hooks/useCostConfirm'
import {
  loadLocalWorks,
  hydrateWorksFromCloud,
  onWorksChanged,
  appendLocalWork,
  toggleWorkSaved,
  removeLocalWorkById,
  type LocalWork,
} from '@/lib/localWorks'
import { type LocalAccount } from '@/lib/localAuth'

import { applyPrefsToModels, loadPrefs } from '@/lib/modelPrefs'

const DEFAULT_MODEL = 'seedream-4.5-white'
const POLL_INTERVAL_MS = 3500
const POLL_TIMEOUT_MS = 3600000
const CUTOUT_PROMPT =
  '請移除這張商品圖的背景，只保留服裝/商品本體：輸出透明背景的服裝平鋪展示圖，完整保留原有顏色、材質、圖案與細節，不要添加任何人物、模特或其他元素。'

// 模型展示名與參考價（選擇器清單本身來自後端 GET /api/aigc/models，這裏只補展示文案）
export const MODEL_META: Record<string, { displayName: string; priceHint: string }> = {}

export type ModeId = 'swap-model' | 'custom-model' | 'auto-4' | 'full-outfit'

export const MODE_OPTIONS: { id: ModeId; label: string; desc: string }[] = [
  { id: 'swap-model', label: '換模特', desc: '選模特卡片 + 拍攝場景' },
  { id: 'custom-model', label: '指定模特', desc: '上傳模特圖，把商品穿到 TA 身上' },
  { id: 'auto-4', label: '自動出 4 張', desc: '自動配模特與場景，4 種風格併發' },
  { id: 'full-outfit', label: '整套穿搭', desc: '多件單品，同一模特一次穿全套' },
]

export const MODEL_PERSONAS = [
  { id: 'female-young', label: '年輕女性', desc: '清新自然，適合休閒運動風' },
  { id: 'female-elegant', label: '優雅女性', desc: '氣質幹練，適合通勤正式風' },
  { id: 'male-young', label: '年輕男性', desc: '陽光活力，適合街頭休閒風' },
  { id: 'male-mature', label: '成熟男性', desc: '穩重商務，適合西裝大衣風' },
  { id: 'girl-kid', label: '女童模特', desc: '可愛甜美，適合童裝' },
  { id: 'boy-kid', label: '男童模特', desc: '活潑帥氣，適合童裝' },
]

export const SCENE_OPTIONS = [
  { id: 'street', label: '街拍', desc: '城市街頭，自然隨拍感' },
  { id: 'studio', label: '棚拍', desc: '乾淨影棚背景，質感大片' },
  { id: 'outdoor', label: '戶外', desc: '公園綠地，柔和自然光' },
  { id: 'cafe', label: '咖啡廳', desc: '暖調室內，生活氛圍感' },
  { id: 'seaside', label: '海邊度假', desc: '沙灘陽光，度假風' },
  { id: 'home', label: '室內家居', desc: '溫馨居家感' },
]

export const OUTFIT_CATEGORIES = ['上衣', '下裝', '連衣裙', '鞋子', '包袋', '配飾']

const AUTO4_STYLES = [
  { label: '雜誌棚拍', desc: '乾淨影棚背景，雜誌大片級布光' },
  { label: '街頭隨拍', desc: '城市街頭，自然 candid 抓拍感' },
  { label: '咖啡生活', desc: '暖調咖啡廳，生活氛圍感' },
  { label: '戶外自然', desc: '公園綠地，柔和自然光' },
]

const OUTFIT_SCENES = [
  { label: '棚拍', desc: '乾淨影棚背景' },
  { label: '街拍', desc: '城市街頭，隨拍感' },
]

export type UploadStatus = 'idle' | 'uploading' | 'done' | 'error'
export type SlotStatus = 'running' | 'success' | 'failed'
export type CutoutStatus = 'idle' | 'cutting' | 'done' | 'failed'

export interface GenSlot {
  slotId: string
  label: string
  jobStatus: SlotStatus
  url: string | null
  taskId: string | null
  errorText: string | null
  usage: AigcUsage | null
  body: Record<string, unknown>
  modelName: string
}

export interface OutfitItem {
  itemId: string
  category: string
  preview: string | null
  url: string | null
  status: UploadStatus
}

export interface SidebarWork {
  key: string
  url: string
  timeLabel: string
  modeLabel: string
  source: 'local' | 'platform'
  saved?: boolean
  jobId?: string
}

export function modelMetaOf(modelName: string) {
  return MODEL_META[modelName] ?? { displayName: modelName, priceHint: '按實際扣費' }
}

function formatTimeLabel(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function useModelGen() {
  // --- Media inputs ---
  const [imageUrlsPreview, setImageUrlsPreview] = useState<string | null>(null)
  const [imageUrlsUrl, setImageUrlsUrl] = useState<string | null>(null)
  const [imageUrlsStatus, setImageUrlsStatus] = useState<UploadStatus>('idle')
  // --- Parameters (prompt = 補充描述; 標量參數按所選模型契約走 paramValues) ---
  const [prompt, setPrompt] = useState('')

  // --- Generation ---
  const [jobDisplayStatus, setJobDisplayStatus] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [needsLogin, setNeedsLogin] = useState(false)

  // --- History ---
  const [genHistory, setGenHistory] = useState<AigcHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [resumingJobIds, setResumingJobIds] = useState<string[]>([])

  // --- Price preview ---
  // 三態徽標: priceLoading?'預估中':(priceText||'按實際扣費')
  // 禁止 View 用 `priceText || '費用預估中'` —— 失敗/空價會被誤當成一直在加載。
  const [priceText, setPriceText] = useState<string | null>(null)
  const [priceLoading, setPriceLoading] = useState(false)
  const priceDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // --- Account ---
  const [account, setAccount] = useState<LocalAccount | null>(null)

  // --- Cost confirm ---
  const costConfirm = useCostConfirm()

  // --- Model selection (清單來自後端，不寫死單一模型) ---
  const [modelOptions, setModelOptions] = useState<AigcModelInfo[]>([])
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL)
  const [paramValues, setParamValues] = useState<Record<string, string>>({})

  // --- Play modes ---
  const [modeId, setModeId] = useState<ModeId>('swap-model')
  const [personaId, setPersonaId] = useState('female-young')
  const [sceneId, setSceneId] = useState('street')
  const [modelImagePreview, setModelImagePreview] = useState<string | null>(null)
  const [modelImageUrl, setModelImageUrl] = useState<string | null>(null)
  const [modelImageStatus, setModelImageStatus] = useState<UploadStatus>('idle')
  const [outfitItems, setOutfitItems] = useState<OutfitItem[]>([])

  // --- Cutout (自動摳服裝) ---
  const [cutoutJobStatus, setCutoutJobStatus] = useState<CutoutStatus>('idle')
  const [cutoutUrl, setCutoutUrl] = useState<string | null>(null)
  const [cutoutError, setCutoutError] = useState<string | null>(null)
  const cutoutStartedRef = useRef(false)

  // --- Generation slots (多任務併發，逐項狀態) ---
  const [genSlots, setGenSlots] = useState<GenSlot[]>([])
  const [restoredResult, setRestoredResult] = useState<{ url: string; taskId: string | null } | null>(null)

  // --- Local works (未登錄可用的本地歷史) ---
  const [localWorks, setLocalWorks] = useState<LocalWork[]>([])
  const [savedKeys, setSavedKeys] = useState<string[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load models + local works + history on mount
  // 作品歷史以雲端為準：進頁時從 PocketBase 灌回，並訂閱後續變動。
  // 這樣換一台電腦登入也看得到自己的作品，而不是綁在這台瀏覽器。
  useEffect(() => {
    void hydrateWorksFromCloud().then(setLocalWorks)
    return onWorksChanged(() => setLocalWorks(loadLocalWorks()))
  }, [])

  useEffect(() => {
    setLocalWorks(loadLocalWorks())
    listAigcModels().then(async list => {
      if (!list.length) return
      // 應用全站引擎設置（生圖/修圖組）：分組過濾 + 隱藏停用引擎 + 默認引擎排最前
      const prefs = await loadPrefs()
      const visible = applyPrefsToModels(list, 'image-edit', prefs)
      if (!visible.length) return
      setModelOptions(visible)
      // 當前選中的引擎被停用時，回退到該組默認
      setSelectedModel(prev => (visible.some(m => m.model === prev) ? prev : visible[0].model))
    })
    loadHistory()
  }, [])

  // 切換模型時按該模型契約重置參數默認值
  useEffect(() => {
    const info = modelOptions.find(m => m.model === selectedModel)
    if (!info) return
    const next: Record<string, string> = {}
    for (const p of info.scalar_params ?? []) {
      if (typeof p.default === 'string') next[p.name] = p.default
      else if (p.enum && p.enum.length) next[p.name] = p.enum[0]
    }
    setParamValues(next)
  }, [selectedModel, modelOptions])

  // 商品圖上傳完成後自動發起摳服裝（帶計費確認）
  useEffect(() => {
    if (imageUrlsStatus === 'done' && imageUrlsUrl && cutoutJobStatus === 'idle' && !cutoutStartedRef.current) {
      cutoutStartedRef.current = true
      costConfirm.runWithCostConfirm(runCutout, priceText || '按實際扣費')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrlsStatus, imageUrlsUrl])

  // Debounced price preview — 參數變化立刻進 loading, 結束後用 formatAigcPricePreview
  // (兼容只回 estimatedPrice、不回 priceText 的 響應)。
  useEffect(() => {
    if (priceDebounceRef.current) clearTimeout(priceDebounceRef.current)
    setPriceLoading(true)
    priceDebounceRef.current = setTimeout(async () => {
      try {
        const r = await previewAigcPrice(selectedModel, { prompt: prompt || '服裝模特試穿效果圖', ...paramValues })
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
  }, [selectedModel, paramValues, prompt])

  async function loadHistory() {
    setHistoryLoading(true)
    try {
      const items = await loadAigcHistory(DEFAULT_MODEL, { page: 1, perPage: 20 })
      if (items?.length) {
        setGenHistory(items)
        const lastSuccess = items.find(it => it.status === 'success' && it.resultUrl)
        if (lastSuccess) {
          setRestoredResult({ url: lastSuccess.resultUrl as string, taskId: lastSuccess.taskId })
          if (lastSuccess.prompt) setPrompt(lastSuccess.prompt)
        }
        // Resume orphan running jobs after refresh / re-entry.
        items
          .filter(it => it.status === 'running')
          .forEach(it => resumePollingJob(it.jobId, it.model || DEFAULT_MODEL))
      }
    } catch {
      // silently fail — history is not critical
    } finally {
      setHistoryLoading(false)
    }
  }

  async function resumePollingJob(jobId: string, modelName: string) {
    setResumingJobIds(prev => (prev.includes(jobId) ? prev : [...prev, jobId]))
    try {
      const res = await resumeAigcJob(
        { jobId, model: modelName },
        { pollIntervalMs: POLL_INTERVAL_MS, deadlineMs: POLL_TIMEOUT_MS },
      )
      if (res.status === 'success') {
        const outs = res.outputs || []
        const url = res.url || outs[0]?.url || ''
        setGenHistory(prev => prev.map(it => (it.jobId === jobId ? { ...it, status: 'success', resultUrl: url } : it)))
        setGenSlots(prev => [
          {
            slotId: `resumed-${jobId}`,
            label: '續跑任務',
            jobStatus: 'success',
            url,
            taskId: res.taskId || jobId,
            errorText: null,
            usage: res.usage || null,
            body: {},
            modelName,
          },
          ...prev,
        ])
      } else {
        if (res.needsLogin || res.errorKind === 'login_required') setNeedsLogin(true)
        const msg = formatAigcFailureMessage(res)
        setGenHistory(prev => prev.map(it => (it.jobId === jobId ? { ...it, status: 'failed', errorMessage: msg } : it)))
      }
    } finally {
      setResumingJobIds(prev => prev.filter(id => id !== jobId))
    }
  }

  function showToast(msg: string) {
    setToast(msg)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 2600)
  }

  async function uploadSlot(
    file: File,
    mediaType: 'image' | 'video' | 'audio',
    setPreview: (v: string | null) => void,
    setUrl: (v: string | null) => void,
    setStatus: (v: UploadStatus) => void
  ) {
    setPreview(URL.createObjectURL(file))
    setStatus('uploading')
    let uploaded = false
    try {
      const r = await uploadAigcMedia(file, mediaType)
      if (typeof r === 'string') {
        setUrl(r)
        setStatus('done')
        uploaded = !!r
      } else if (r.ok) {
        const url = r.downloadUrl || r.download_url || ''
        setUrl(url)
        setStatus(url ? 'done' : 'error')
        uploaded = !!url
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
      showToast('圖片上傳失敗，請重試')
    } finally {
      if (!uploaded) setStatus('error')
    }
  }

  function resetCutout() {
    cutoutStartedRef.current = false
    setCutoutJobStatus('idle')
    setCutoutUrl(null)
    setCutoutError(null)
    setGenSlots([])
    setRestoredResult(null)
  }

  function handleImageUrlsChange(file: File | null) {
    if (!file) {
      setImageUrlsPreview(null)
      setImageUrlsUrl(null)
      setImageUrlsStatus('idle')
      resetCutout()
      return
    }
    resetCutout()
    uploadSlot(file, 'image', setImageUrlsPreview, setImageUrlsUrl, setImageUrlsStatus)
  }

  function handleModelImageChange(file: File | null) {
    if (!file) {
      setModelImagePreview(null)
      setModelImageUrl(null)
      setModelImageStatus('idle')
      return
    }
    uploadSlot(file, 'image', setModelImagePreview, setModelImageUrl, setModelImageStatus)
  }

  function handleAddOutfitItem(file: File | null, category: string) {
    if (!file) return
    const itemId = `item-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
    const preview = URL.createObjectURL(file)
    setOutfitItems(prev => [...prev, { itemId, category, preview, url: null, status: 'uploading' }])
    uploadAigcMedia(file, 'image')
      .then(r => {
        const url = typeof r === 'string' ? r : r.ok ? r.downloadUrl || r.download_url || '' : ''
        setOutfitItems(prev => prev.map(it => (it.itemId === itemId ? { ...it, url, status: url ? 'done' : 'error' } : it)))
      })
      .catch(() => {
        setOutfitItems(prev => prev.map(it => (it.itemId === itemId ? { ...it, status: 'error' } : it)))
        showToast('圖片上傳失敗，請重試')
      })
  }

  function handleRemoveOutfitItem(itemId: string) {
    setOutfitItems(prev => prev.filter(it => it.itemId !== itemId))
  }

  function buildBody(modelName: string, promptText: string, urls: string[], opts?: { preferTransparent?: boolean; portraitBias?: boolean }) {
    const info = modelOptions.find(m => m.model === modelName) ?? null
    const body: Record<string, unknown> = { prompt: promptText, imageUrls: urls }
    for (const p of info?.scalar_params ?? []) {
      let val = paramValues[p.name] ?? (typeof p.default === 'string' ? p.default : p.enum?.[0] ?? '')
      if (opts?.preferTransparent && p.name === 'background' && (p.enum ?? []).includes('transparent')) val = 'transparent'
      if (opts?.portraitBias && p.name === 'size' && (p.enum ?? []).includes('1024*1536')) val = '1024*1536'
      if (opts?.portraitBias && p.name === 'aspectRatio' && (p.enum ?? []).includes('3:4')) val = '3:4'
      if (val !== '') body[p.name] = val
    }
    return body
  }

  async function runCutout() {
    if (!imageUrlsUrl) return
    setCutoutJobStatus('cutting')
    setCutoutError(null)
    const body = buildBody(selectedModel, CUTOUT_PROMPT, [imageUrlsUrl], { preferTransparent: true })
    const res = await callAigcAndPoll(selectedModel, body, { pollIntervalMs: POLL_INTERVAL_MS, deadlineMs: POLL_TIMEOUT_MS })
    if (res.status === 'success') {
      const outs = res.outputs || []
      setCutoutUrl(res.url || outs[0]?.url || '')
      setCutoutJobStatus('done')
    } else {
      if (res.needsLogin || res.errorKind === 'login_required') setNeedsLogin(true)
      setCutoutError(formatAigcFailureMessage(res))
      setCutoutJobStatus('failed')
    }
  }

  function handleRetryCutout() {
    if (cutoutJobStatus === 'cutting' || !imageUrlsUrl) return
    costConfirm.runWithCostConfirm(runCutout, priceText || '按實際扣費')
  }

  function modeLabelOf(id: ModeId): string {
    return MODE_OPTIONS.find(m => m.id === id)?.label ?? '生成'
  }

  function buildSlotPlans(): { label: string; promptText: string; urls: string[] }[] {
    const garmentUrl = cutoutUrl as string
    const extraReq = prompt.trim() ? `；補充要求：${prompt.trim()}` : ''
    if (modeId === 'custom-model') {
      return [
        {
          label: '指定模特試穿',
          promptText: `圖 1 是透明背景的服裝，圖 2 是指定模特。請讓圖 2 的模特穿上圖 1 的服裝，完整保留模特的五官、髮型與體型特徵，服裝細節清晰，真實攝影風格，自然光線，四分之三身構圖${extraReq}`,
          urls: [garmentUrl, modelImageUrl as string],
        },
      ]
    }
    if (modeId === 'auto-4') {
      return AUTO4_STYLES.map(st => ({
        label: `自動風格 · ${st.label}`,
        promptText: `圖 1 是透明背景的服裝。請自動搭配一位氣質匹配的模特穿上這件服裝，畫面風格：${st.label}（${st.desc}）。服裝細節完整清晰，真實攝影風格${extraReq}`,
        urls: [garmentUrl],
      }))
    }
    if (modeId === 'full-outfit') {
      const itemUrls = outfitItems.filter(it => it.status === 'done' && it.url).map(it => it.url as string)
      const itemDesc = outfitItems.filter(it => it.status === 'done').map(it => it.category).join('、')
      return OUTFIT_SCENES.map(sc => ({
        label: `整套穿搭 · ${sc.label}`,
        promptText: `圖 1 是主單品（透明背景），其餘圖片是搭配單品（${itemDesc}）。請讓同一位模特把所有圖片中的服裝單品組合成一套完整穿搭穿上身，場景：${sc.label}（${sc.desc}）。全身構圖，真實攝影風格，每件單品的細節都要清晰可辨${extraReq}`,
        urls: [garmentUrl, ...itemUrls],
      }))
    }
    const persona = MODEL_PERSONAS.find(x => x.id === personaId) ?? MODEL_PERSONAS[0]
    const scene = SCENE_OPTIONS.find(x => x.id === sceneId) ?? SCENE_OPTIONS[0]
    return [
      {
        label: `${persona.label} × ${scene.label}`,
        promptText: `圖 1 是透明背景的服裝。請讓一位${persona.label}（${persona.desc}）模特穿上這件服裝，拍攝場景：${scene.label}（${scene.desc}）。服裝細節完整清晰，真實攝影風格，自然光線，四分之三身構圖${extraReq}`,
        urls: [garmentUrl],
      },
    ]
  }

  function applySlotOutcome(slotId: string, res: AigcResult, workLabel: string, modelName: string, promptText: string) {
    if (res.status === 'success') {
      const outs = res.outputs || []
      const url = res.url || outs[0]?.url || ''
      setGenSlots(prev => prev.map(s => (s.slotId === slotId ? { ...s, jobStatus: 'success', url, taskId: res.taskId || null, usage: res.usage || null } : s)))
      if (url) {
        const work: LocalWork = {
          id: slotId,
          url,
          createdIso: new Date().toISOString(),
          modeLabel: workLabel,
          modelName,
          prompt: promptText,
          taskId: res.taskId || null,
        }
        setLocalWorks(appendLocalWork(work))
      }
    } else {
      if (res.needsLogin || res.errorKind === 'login_required') setNeedsLogin(true)
      const detail = formatAigcFailureMessage(res)
      setGenSlots(prev => prev.map(s => (s.slotId === slotId ? { ...s, jobStatus: 'failed', errorText: detail } : s)))
      setErrorMsg(detail)
    }
  }

  async function runGeneration() {
    if (!cutoutUrl || cutoutJobStatus !== 'done') return
    const modelName = selectedModel
    const plans = buildSlotPlans()
    const stamped: GenSlot[] = plans.map((pl, i) => ({
      slotId: `slot-${Date.now()}-${i}`,
      label: pl.label,
      jobStatus: 'running',
      url: null,
      taskId: null,
      errorText: null,
      usage: null,
      body: buildBody(modelName, pl.promptText, pl.urls, { portraitBias: true }),
      modelName,
    }))
    setGenSlots(stamped)
    setRestoredResult(null)
    setErrorMsg(null)
    setJobDisplayStatus('running')

    const workLabel = modeLabelOf(modeId)
    await Promise.all(
      stamped.map(async (slot, i) => {
        if (i > 0) await new Promise(r => setTimeout(r, i * 400))
        const res = await callAigcAndPoll(modelName, slot.body, { pollIntervalMs: POLL_INTERVAL_MS, deadlineMs: POLL_TIMEOUT_MS })
        applySlotOutcome(slot.slotId, res, workLabel, modelName, String(slot.body.prompt ?? ''))
      }),
    )
    setJobDisplayStatus('done')
    void loadHistory()
  }

  function handleGenerate() {
    if (!canGenerate) return
    const displayPrice = priceText ? `${priceText} × ${taskCount} 張` : '按 AI provider 實際扣費'
    costConfirm.runWithCostConfirm(runGeneration, displayPrice)
  }

  async function handleRetrySlot(slotId: string) {
    const slot = genSlots.find(s => s.slotId === slotId)
    if (!slot || slot.jobStatus === 'running' || !slot.body?.prompt) return
    setGenSlots(prev => prev.map(s => (s.slotId === slotId ? { ...s, jobStatus: 'running', errorText: null } : s)))
    const res = await callAigcAndPoll(slot.modelName, slot.body, { pollIntervalMs: POLL_INTERVAL_MS, deadlineMs: POLL_TIMEOUT_MS })
    applySlotOutcome(slotId, res, slot.label, slot.modelName, String(slot.body.prompt ?? ''))
  }

  function handleDownload(url: string) {
    void downloadAigcResult(url)
  }

  function handleSaveWork(slotId: string, url: string) {
    if (!url || savedKeys.includes(slotId)) return
    setLocalWorks(toggleWorkSaved(slotId))
    setSavedKeys(prev => [...prev, slotId])
    showToast('已保存到我的作品')
  }

  function handleRemoveLocalWork(key: string) {
    setLocalWorks(removeLocalWorkById(key))
    showToast('已刪除該記錄')
  }

  function handleShowWork(url: string) {
    if (!url) return
    setRestoredResult({ url, taskId: null })
    setGenSlots([])
  }

  function handleSelectModel(modelName: string) {
    setSelectedModel(modelName)
  }

  function handleParamChange(name: string, value: string) {
    setParamValues(prev => ({ ...prev, [name]: value }))
  }

  function handleModeChange(id: ModeId) {
    setModeId(id)
  }

  async function handleUpdateHistory(jobId: string, updates: AigcHistoryPatch) {
    const modelName = genHistory.find(it => it.jobId === jobId)?.model || DEFAULT_MODEL
    try {
      await updateAigcHistoryItem(modelName, jobId, updates)
      setGenHistory(prev => prev.map(it => (it.jobId === jobId ? { ...it, ...updates } : it)))
    } catch {
      // silent fail
    }
  }

  async function handleDeleteHistory(jobId: string) {
    const modelName = genHistory.find(it => it.jobId === jobId)?.model || DEFAULT_MODEL
    try {
      await deleteAigcHistoryItem(modelName, jobId)
      setGenHistory(prev => prev.filter(it => it.jobId !== jobId))
    } catch {
      // silent fail
    }
  }

  function handleRestoreHistory(item: AigcHistoryItem) {
    setRestoredResult({ url: item.resultUrl ?? '', taskId: item.taskId })
    setGenSlots([])
  }

  const isGenerating = genSlots.some(s => s.jobStatus === 'running')
  const taskCount = modeId === 'auto-4' ? 4 : modeId === 'full-outfit' ? 2 : 1

  const modeReady =
    modeId === 'swap-model'
      ? !!personaId && !!sceneId
      : modeId === 'custom-model'
        ? !!modelImageUrl && modelImageStatus === 'done'
        : modeId === 'full-outfit'
          ? outfitItems.some(it => it.status === 'done' && !!it.url)
          : true

  const canGenerate = !!cutoutUrl && cutoutJobStatus === 'done' && modeReady && !isGenerating

  const stepIndex =
    imageUrlsStatus !== 'done' || !imageUrlsUrl ? 0 : cutoutJobStatus !== 'done' ? 1 : !modeReady ? 2 : 3

  const sidebarWorks = useMemo<SidebarWork[]>(() => {
    const local: SidebarWork[] = localWorks.map(w => ({
      key: w.id,
      url: w.url,
      timeLabel: formatTimeLabel(w.createdIso),
      modeLabel: w.modeLabel,
      source: 'local',
      saved: !!w.saved,
    }))
    const seen = new Set(local.map(w => w.url))
    const platform: SidebarWork[] = genHistory
      .filter(h => h.status === 'success' && h.resultUrl && !seen.has(h.resultUrl))
      .slice(0, 12)
      .map(h => ({
        key: `pb-${h.jobId}`,
        url: h.resultUrl as string,
        timeLabel: formatTimeLabel(h.created),
        modeLabel: '生成記錄',
        source: 'platform',
        jobId: h.jobId,
      }))
    return [...local, ...platform]
  }, [localWorks, genHistory])

  const selectedInfo = modelOptions.find(m => m.model === selectedModel) ?? null

  return {
    // 流程條
    stepIndex,
    // 商品圖上傳
    imageUrlsPreview, imageUrlsUrl, imageUrlsStatus, handleImageUrlsChange,
    // 摳服裝
    cutoutJobStatus, cutoutUrl, cutoutError, handleRetryCutout,
    // 模型選擇（可配置清單，不寫死）
    modelOptions, selectedModel, selectedInfo, handleSelectModel,
    paramValues, handleParamChange,
    // 玩法
    modeId, handleModeChange,
    personaId, setPersonaId, sceneId, setSceneId,
    modelImagePreview, modelImageStatus, handleModelImageChange,
    outfitItems, handleAddOutfitItem, handleRemoveOutfitItem,
    prompt, setPrompt,
    // 生成
    isGenerating, canGenerate, taskCount, handleGenerate,
    genSlots, handleRetrySlot, handleDownload, handleSaveWork, savedKeys,
    restoredResult, jobDisplayStatus,
    // 提示 / 錯誤
    errorMsg, setErrorMsg, toast, needsLogin, setNeedsLogin,
    // 平臺歷史（斷點續跑 / 恢復）
    genHistory, historyLoading, resumingJobIds,
    handleUpdateHistory, handleDeleteHistory, handleRestoreHistory,
    // 側邊欄作品
    sidebarWorks, handleRemoveLocalWork, handleShowWork,
    // 價格 + 計費確認
    priceText, priceLoading,
    account, setAccount,
    ...costConfirm,
  }
}
