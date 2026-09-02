import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
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
  '請移除這張商品圖的背景，只保留商品本體：輸出透明背景的商品展示圖，完整保留原有顏色、材質、圖案與細節，不要添加任何人物、文字或其他元素。'

// 模型展示名與參考價（選擇器清單本身來自後端 GET /api/aigc/models，這裏只補展示文案）
export const MODEL_META: Record<string, { displayName: string; priceHint: string }> = {}

export const SCENE_TEMPLATES: { id: string; label: string; desc: string }[] = [
  { id: 'table-still', label: '餐桌靜物', desc: '木質餐桌，柔和側光，靜物大片感' },
  { id: 'outdoor-grass', label: '戶外草地', desc: '綠色草地，自然光，清新戶外感' },
  { id: 'festival', label: '節日氛圍', desc: '彩燈禮盒點綴，濃濃節日感' },
  { id: 'studio-solid', label: '純色棚拍', desc: '乾淨純色影棚背景，質感電商主圖' },
  { id: 'cafe', label: '咖啡廳', desc: '暖調咖啡廳一角，生活氛圍感' },
  { id: 'seaside', label: '海邊度假', desc: '沙灘海浪，明亮度假風' },
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

export function useScene() {
  const [searchParams, setSearchParams] = useSearchParams()
  // --- Media inputs ---
  const [imageUrlsPreview, setImageUrlsPreview] = useState<string | null>(null)
  const [imageUrlsUrl, setImageUrlsUrl] = useState<string | null>(null)
  const [imageUrlsStatus, setImageUrlsStatus] = useState<UploadStatus>('idle')
  // --- Parameters (prompt = 自定義場景描述; 標量參數按所選模型契約走 paramValues) ---
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

  // --- Scene selection (模板多選 + 自定義描述) ---
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>(['table-still'])

  // --- Cutout (自動摳商品) ---
  const [cutoutJobStatus, setCutoutJobStatus] = useState<CutoutStatus>('idle')
  const [cutoutUrl, setCutoutUrl] = useState<string | null>(null)
  const [cutoutError, setCutoutError] = useState<string | null>(null)
  const cutoutStartedRef = useRef(false)

  // --- Generation slots (多場景併發，逐項狀態) ---
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

  // 從「我的作品」繼續加工跳轉（帶 ?src= 圖）：直接作爲商品圖載入，隨後走既有的自動摳圖流程
  useEffect(() => {
    const src = searchParams.get('src')
    if (!src) return
    setSearchParams({}, { replace: true })
    resetCutout()
    setImageUrlsPreview(src)
    setImageUrlsUrl(src)
    setImageUrlsStatus('done')
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // 商品圖上傳完成後自動發起摳圖（帶計費確認）
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
        const r = await previewAigcPrice(selectedModel, { prompt: prompt || '商品場景展示圖', ...paramValues })
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

  function buildBody(modelName: string, promptText: string, urls: string[], opts?: { preferTransparent?: boolean }) {
    const info = modelOptions.find(m => m.model === modelName) ?? null
    const body: Record<string, unknown> = { prompt: promptText, imageUrls: urls }
    for (const p of info?.scalar_params ?? []) {
      let val = paramValues[p.name] ?? (typeof p.default === 'string' ? p.default : p.enum?.[0] ?? '')
      if (opts?.preferTransparent && p.name === 'background' && (p.enum ?? []).includes('transparent')) val = 'transparent'
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

  function handleToggleTemplate(id: string) {
    setSelectedTemplateIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  }

  function buildSlotPlans(): { label: string; promptText: string }[] {
    const plans: { label: string; promptText: string }[] = []
    for (const id of selectedTemplateIds) {
      const t = SCENE_TEMPLATES.find(x => x.id === id)
      if (!t) continue
      plans.push({
        label: t.label,
        promptText: `圖 1 是透明背景的商品。請把這個商品自然地放進真實場景：${t.label}（${t.desc}）。商品的外觀、顏色、logo 與所有細節完整保留不變，光影與陰影自然融合，真實攝影風格，電商展示構圖。`,
      })
    }
    const custom = prompt.trim()
    if (custom) {
      plans.push({
        label: '自定義場景',
        promptText: `圖 1 是透明背景的商品。請把這個商品自然地放進真實場景：${custom}。商品的外觀、顏色、logo 與所有細節完整保留不變，光影與陰影自然融合，真實攝影風格，電商展示構圖。`,
      })
    }
    return plans
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
    if (!plans.length) return
    const stamped: GenSlot[] = plans.map((pl, i) => ({
      slotId: `slot-${Date.now()}-${i}`,
      label: pl.label,
      jobStatus: 'running',
      url: null,
      taskId: null,
      errorText: null,
      usage: null,
      body: buildBody(modelName, pl.promptText, [cutoutUrl as string]),
      modelName,
    }))
    setGenSlots(stamped)
    setRestoredResult(null)
    setErrorMsg(null)
    setJobDisplayStatus('running')

    await Promise.all(
      stamped.map(async (slot, i) => {
        if (i > 0) await new Promise(r => setTimeout(r, i * 400))
        const res = await callAigcAndPoll(modelName, slot.body, { pollIntervalMs: POLL_INTERVAL_MS, deadlineMs: POLL_TIMEOUT_MS })
        applySlotOutcome(slot.slotId, res, slot.label, modelName, String(slot.body.prompt ?? ''))
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
  const taskCount = selectedTemplateIds.length + (prompt.trim() ? 1 : 0)

  const canGenerate = !!cutoutUrl && cutoutJobStatus === 'done' && taskCount > 0 && !isGenerating

  const stepIndex =
    imageUrlsStatus !== 'done' || !imageUrlsUrl ? 0 : cutoutJobStatus !== 'done' ? 1 : taskCount === 0 ? 2 : 3

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
        modeLabel: '場景生成',
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
    // 摳商品
    cutoutJobStatus, cutoutUrl, cutoutError, handleRetryCutout,
    // 模型選擇（可配置清單，不寫死）
    modelOptions, selectedModel, selectedInfo, handleSelectModel,
    paramValues, handleParamChange,
    // 場景選擇（模板多選 + 自定義描述）
    selectedTemplateIds, handleToggleTemplate,
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
