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
import type { AigcOutput, AigcUsage, AigcHistoryItem, AigcHistoryPatch, AigcModelInfo } from '@/lib/aigc'
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

import { applyPrefsToModels, loadPrefs, type ModelPrefsData } from '@/lib/modelPrefs'

const DEFAULT_EDIT_MODEL = 'seedream-4.5-white'
const POLL_INTERVAL_MS = 3500
const POLL_TIMEOUT_MS = 3600000

export type UploadStatus = 'idle' | 'uploading' | 'done' | 'error'
export type ToolId = 'remove-bg' | 'upscale' | 'remove-watermark'
export type EngineCategory = 'edit' | 'upscale'

export interface ToolDef {
  id: ToolId
  label: string
  tagline: string
  category: EngineCategory
  nextTool: ToolId | null
  nextHint: string
}

export const TOOL_DEFS: ToolDef[] = [
  { id: 'remove-bg', label: '去背景', tagline: '摳出主體，輸出透明底圖', category: 'edit', nextTool: null, nextHint: '' },
  { id: 'upscale', label: '高清修復', tagline: '目前沒有可用引擎，暫不可處理', category: 'upscale', nextTool: null, nextHint: '' },
  { id: 'remove-watermark', label: '去水印', tagline: '抹掉圖上文字與標誌', category: 'edit', nextTool: null, nextHint: '' },
]

// 引擎展示名與參考價（清單本身來自後端 GET /api/aigc/models，這裏只補展示文案）
export const MODEL_META: Record<string, { displayName: string; priceHint: string }> = {}

export function modelMetaOf(modelName: string) {
  return MODEL_META[modelName] ?? { displayName: modelName, priceHint: '按實際扣費' }
}

export function toolDefOf(toolId: ToolId): ToolDef {
  return TOOL_DEFS.find(t => t.id === toolId) ?? TOOL_DEFS[0]
}

// 按模型契約動態分類引擎：帶 prompt 指令輸入的圖像模型 → 去背景/去水印引擎；
// 無 prompt、單圖進單圖出 → 高清放大引擎。不寫死 slug。
export function engineCategoryOf(info: AigcModelInfo): EngineCategory | null {
  if (info.output_type !== 'image') return null
  if (info.primary_input?.name === 'prompt') return 'edit'
  const media = info.media_params ?? []
  if (media.length === 1 && media[0].type === 'image' && !media[0].multiple) return 'upscale'
  return null
}

function buildToolPrompt(toolId: ToolId, extra: string): string {
  const extraText = extra.trim()
  const suffix = extraText ? `補充要求：${extraText}。` : ''
  if (toolId === 'remove-bg') {
    return `請移除這張圖的背景，只保留畫面主體：輸出透明背景的圖片，完整保留原有顏色、材質、圖案與細節，邊緣乾淨利落，不要添加任何人物、文字或其他元素。${suffix}`
  }
  return `請抹掉這張圖上的所有水印、文字、字幕和標誌圖案，乾淨地還原它們遮擋處的畫面內容，保持圖像其餘部分完全不變，不要添加任何新的元素。${suffix}`
}

function formatTimeLabel(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export interface PipelineStep {
  step: number
  toolId: ToolId
  toolLabel: string
  modelName: string
  url: string
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

export function useTools() {
  const [searchParams, setSearchParams] = useSearchParams()
  // --- Media inputs ---
  const [imageUrlsPreview, setImageUrlsPreview] = useState<string | null>(null)
  const [imageUrlsUrl, setImageUrlsUrl] = useState<string | null>(null)
  const [imageUrlsStatus, setImageUrlsStatus] = useState<UploadStatus>('idle')

  // --- Tool / engine selection (清單來自後端，不寫死單一引擎) ---
  const [activeTool, setActiveTool] = useState<ToolId>('remove-bg')
  const [modelOptions, setModelOptions] = useState<AigcModelInfo[]>([])
  const [selectedModel, setSelectedModel] = useState(DEFAULT_EDIT_MODEL)
  const [modelPrefs, setModelPrefs] = useState<ModelPrefsData | null>(null)
  const [paramValues, setParamValues] = useState<Record<string, string>>({})
  const [extraPrompt, setExtraPrompt] = useState('')
  const [worksPickerOpen, setWorksPickerOpen] = useState(false)

  // --- Generation ---
  const [isGenerating, setIsGenerating] = useState(false)
  const [jobDisplayStatus, setJobDisplayStatus] = useState('')
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [resultType, setResultType] = useState<string | null>(null)
  const [resultOutputs, setResultOutputs] = useState<AigcOutput[]>([])
  const [resultTaskId, setResultTaskId] = useState<string | null>(null)
  const [resultUsage, setResultUsage] = useState<AigcUsage | null>(null)
  const [lastInputUrl, setLastInputUrl] = useState<string | null>(null)
  const [splitPos, setSplitPos] = useState(50)
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([])
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

  // --- Local works (未登錄可用的本地歷史) ---
  const [localWorks, setLocalWorks] = useState<LocalWork[]>([])
  const [savedKeys, setSavedKeys] = useState<string[]>([])
  const [lastWorkId, setLastWorkId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const beforeUrlRef = useRef<Record<string, string>>({})

  const activeDef = toolDefOf(activeTool)

  // 每個工具只展示能接收「提示詞 + 圖片」的模型；沒有操作級 capability
  // 資訊時，不宣稱服務商能保證某個模型原生支持去背景或去水印。
  const toolModels = useMemo(
    () => {
      if (activeDef.category === 'upscale') return []
      const candidates = applyPrefsToModels(modelOptions, 'image-edit', modelPrefs)
      return candidates.filter(model =>
        model.primary_input?.name === 'prompt' &&
        (model.media_params ?? []).some(media => media.type === 'image'),
      )
    },
    [modelOptions, activeDef.category, modelPrefs],
  )

  // Load models + local works + history on mount
  // 作品歷史以雲端為準：進頁時從 PocketBase 灌回，並訂閱後續變動。
  // 這樣換一台電腦登入也看得到自己的作品，而不是綁在這台瀏覽器。
  useEffect(() => {
    void hydrateWorksFromCloud().then(setLocalWorks)
    return onWorksChanged(() => setLocalWorks(loadLocalWorks()))
  }, [])

  useEffect(() => {
    setLocalWorks(loadLocalWorks())
    listAigcModels().then(list => {
      if (list.length) setModelOptions(list)
    })
    loadPrefs().then(setModelPrefs)
    loadHistory()
  }, [])

  // 從「我的作品」繼續加工跳轉（帶 ?src= 圖）：直接載入爲待處理圖片，用戶選工具後點處理即可
  useEffect(() => {
    const src = searchParams.get('src')
    if (!src) return
    setSearchParams({}, { replace: true })
    setImageUrlsPreview(src)
    setImageUrlsUrl(src)
    setImageUrlsStatus('done')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 切換引擎時按該引擎契約重置參數默認值（string/enum/bool/number 全覆蓋）
  useEffect(() => {
    const info = modelOptions.find(m => m.model === selectedModel)
    if (!info) return
    const next: Record<string, string> = {}
    for (const p of info.scalar_params ?? []) {
      if (typeof p.default === 'string') next[p.name] = p.default
      else if (p.enum && p.enum.length) next[p.name] = p.enum[0]
      else if (typeof p.default === 'boolean') next[p.name] = p.default ? 'true' : 'false'
      else if (typeof p.default === 'number') next[p.name] = String(p.default)
    }
    setParamValues(next)
  }, [selectedModel, modelOptions])

  // Debounced price preview — 參數變化立刻進 loading, 結束後用 formatAigcPricePreview
  // (兼容只回 estimatedPrice、不回 priceText 的 響應)。
  useEffect(() => {
    if (priceDebounceRef.current) clearTimeout(priceDebounceRef.current)
    setPriceLoading(true)
    priceDebounceRef.current = setTimeout(async () => {
      try {
        const r = await previewAigcPrice(selectedModel, buildScalarBody(activeTool))
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModel, paramValues, extraPrompt, activeTool])

  async function loadHistory() {
    setHistoryLoading(true)
    try {
      const items = await loadAigcHistory(DEFAULT_EDIT_MODEL, { page: 1, perPage: 20 })
      if (items?.length) {
        setGenHistory(items)
        // Resume orphan running jobs after refresh / re-entry.
        items
          .filter(it => it.status === 'running')
          .forEach(it => resumePollingJob(it.jobId, it.model || DEFAULT_EDIT_MODEL))
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

  function defaultParamStr(p: { default?: string | number | boolean; enum?: string[] }): string {
    if (typeof p.default === 'string') return p.default
    if (p.enum && p.enum.length) return p.enum[0]
    if (typeof p.default === 'boolean') return p.default ? 'true' : 'false'
    if (typeof p.default === 'number') return String(p.default)
    return ''
  }

  // 標量參數 + prompt（按當前工具生成，不寫死）；媒體字段由 buildSubmitBody 追加
  function buildScalarBody(toolId: ToolId): Record<string, unknown> {
    const info = modelOptions.find(m => m.model === selectedModel) ?? null
    const body: Record<string, unknown> = {}
    if (info?.primary_input?.name === 'prompt') {
      body.prompt = buildToolPrompt(toolId, extraPrompt)
    }
    for (const p of info?.scalar_params ?? []) {
      let val = paramValues[p.name] ?? defaultParamStr(p)
      if (toolId === 'remove-bg' && p.name === 'background' && (p.enum ?? []).includes('transparent')) val = 'transparent'
      if (val === '') continue
      if (p.type === 'number') body[p.name] = Number(val)
      else if (p.type === 'bool') body[p.name] = val === 'true'
      else body[p.name] = val
    }
    return body
  }

  function buildSubmitBody(toolId: ToolId, urls: string[]): Record<string, unknown> {
    const info = modelOptions.find(m => m.model === selectedModel) ?? null
    const media = info?.media_params?.[0]
    const body = buildScalarBody(toolId)
    if (media) {
      body[media.name] = media.multiple ? urls : urls[0]
    } else {
      body.imageUrls = urls
    }
    return body
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

  function clearResultArea() {
    setResultUrl(null)
    setResultType(null)
    setResultOutputs([])
    setResultTaskId(null)
    setResultUsage(null)
    setLastInputUrl(null)
    setErrorMsg(null)
    setSplitPos(50)
  }

  function handleImageUrlsChange(file: File | null) {
    if (!file) {
      setImageUrlsPreview(null)
      setImageUrlsUrl(null)
      setImageUrlsStatus('idle')
      clearResultArea()
      return
    }
    clearResultArea()
    uploadSlot(file, 'image', setImageUrlsPreview, setImageUrlsUrl, setImageUrlsStatus)
  }

  function handlePickWork(url: string) {
    if (!url) return
    setImageUrlsPreview(url)
    setImageUrlsUrl(url)
    setImageUrlsStatus('done')
    setWorksPickerOpen(false)
    clearResultArea()
    showToast('已選用作品裏的圖片')
  }

  function handleSelectTool(toolId: ToolId) {
    if (toolId === activeTool) return
    setActiveTool(toolId)
    const def = toolDefOf(toolId)
    // 應用引擎設置（過濾停用 + 默認引擎排最前），隊首即當前生效的默認引擎
    const candidates = applyPrefsToModels(modelOptions, def.category === 'edit' ? 'image-edit' : 'upscale', modelPrefs)
    const next = candidates[0]?.model ?? selectedModel
    setSelectedModel(next)
    clearResultArea()
  }

  function handleSelectModel(modelName: string) {
    setSelectedModel(modelName)
  }

  function handleParamChange(name: string, value: string) {
    setParamValues(prev => ({ ...prev, [name]: value }))
  }

  async function runGenerate() {
    if (!imageUrlsUrl || imageUrlsStatus !== 'done') return
    const inputUrl = imageUrlsUrl
    const modelName = selectedModel
    const def = activeDef
    const runBody = buildSubmitBody(activeTool, [inputUrl])
    const promptUsed = typeof runBody.prompt === 'string' ? runBody.prompt : def.label

    setIsGenerating(true)
    setErrorMsg(null)
    setJobDisplayStatus('queued')
    clearResultArea()
    setLastInputUrl(inputUrl)

    try {
      setJobDisplayStatus('running')
      // Submit + poll via callAigcAndPoll (shared helper; do not hand-roll while poll).
      const res = await callAigcAndPoll(modelName, runBody, {
        pollIntervalMs: POLL_INTERVAL_MS,
        deadlineMs: POLL_TIMEOUT_MS,
      })

      if (res.status === 'success') {
        const outs = res.outputs || []
        const url = res.url || outs[0]?.url || ''
        setResultOutputs(outs)
        setResultUrl(url)
        setResultType(outs[0]?.type || null)
        setResultTaskId(res.taskId || null)
        setResultUsage(res.usage || null)
        setJobDisplayStatus('succeeded')
        setSplitPos(50)
        if (url) {
          beforeUrlRef.current[url] = inputUrl
          setPipelineSteps(prev => [
            ...prev,
            { step: prev.length + 1, toolId: def.id, toolLabel: def.label, modelName, url },
          ])
          const workId = `tool-${Date.now()}`
          const work: LocalWork = {
            id: workId,
            url,
            createdIso: new Date().toISOString(),
            modeLabel: `圖片工具 · ${def.label}`,
            modelName,
            prompt: promptUsed,
            taskId: res.taskId || null,
          }
          setLastWorkId(workId)
          setLocalWorks(appendLocalWork(work))
        }
        void loadHistory()
      } else {
        if (res.needsLogin || res.errorKind === 'login_required') setNeedsLogin(true)
        setErrorMsg(formatAigcFailureMessage(res))
        setJobDisplayStatus(res.errorKind === 'timeout' ? 'timeout' : 'failed')
      }
    } finally {
      setIsGenerating(false)
    }
  }

  function handleGenerate() {
    if (!canGenerate) return
    const displayPrice = priceText || '按 AI provider 實際扣費'
    costConfirm.runWithCostConfirm(runGenerate, displayPrice)
  }

  // 流水線：把當前結果作爲下一個工具的輸入（去背景→高清修復爲主路徑）
  function handleContinuePipeline() {
    const def = activeDef
    if (!def.nextTool || !resultUrl) return
    const nextDef = toolDefOf(def.nextTool)
    setActiveTool(nextDef.id)
    const candidates = applyPrefsToModels(modelOptions, nextDef.category === 'edit' ? 'image-edit' : 'upscale', modelPrefs)
    const next = candidates[0]?.model ?? selectedModel
    setSelectedModel(next)
    setImageUrlsPreview(resultUrl)
    setImageUrlsUrl(resultUrl)
    setImageUrlsStatus('done')
    clearResultArea()
    showToast(`第 ${pipelineSteps.length + 1} 步已就緒：${nextDef.label}`)
  }

  function handleResetAll() {
    clearResultArea()
    setPipelineSteps([])
    setImageUrlsPreview(null)
    setImageUrlsUrl(null)
    setImageUrlsStatus('idle')
    setWorksPickerOpen(false)
  }

  function handleDownload(url: string) {
    void downloadAigcResult(url)
  }

  function handleSaveWork(workId: string | null) {
    if (!workId || savedKeys.includes(workId)) return
    setLocalWorks(toggleWorkSaved(workId))
    setSavedKeys(prev => [...prev, workId])
    showToast('已保存到我的作品')
  }

  function handleRemoveLocalWork(key: string) {
    setLocalWorks(removeLocalWorkById(key))
    showToast('已刪除該記錄')
  }

  function handleShowWork(url: string) {
    if (!url) return
    setResultUrl(url)
    setResultType(null)
    setResultOutputs([])
    setResultTaskId(null)
    setResultUsage(null)
    setLastInputUrl(beforeUrlRef.current[url] ?? null)
    setErrorMsg(null)
    setSplitPos(50)
  }

  function handleUpdateHistory(jobId: string, updates: AigcHistoryPatch) {
    const modelName = genHistory.find(it => it.jobId === jobId)?.model || DEFAULT_EDIT_MODEL
    updateAigcHistoryItem(modelName, jobId, updates)
      .then(() => setGenHistory(prev => prev.map(it => (it.jobId === jobId ? { ...it, ...updates } : it))))
      .catch(() => {
        // silent fail
      })
  }

  function handleDeleteHistory(jobId: string) {
    const modelName = genHistory.find(it => it.jobId === jobId)?.model || DEFAULT_EDIT_MODEL
    deleteAigcHistoryItem(modelName, jobId)
      .then(() => setGenHistory(prev => prev.filter(it => it.jobId !== jobId)))
      .catch(() => {
        // silent fail
      })
  }

  function handleRestoreHistory(item: AigcHistoryItem) {
    if (!item.resultUrl) return
    handleShowWork(item.resultUrl)
    setResultTaskId(item.taskId)
  }

  const canGenerate = !!imageUrlsUrl && imageUrlsStatus === 'done' && !isGenerating && toolModels.length > 0

  const stepIndex = !imageUrlsUrl || imageUrlsStatus !== 'done' ? 0 : resultUrl ? 2 : 1

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
        modeLabel: '圖片工具',
        source: 'platform',
        jobId: h.jobId,
      }))
    return [...local, ...platform]
  }, [localWorks, genHistory])

  const selectedInfo = modelOptions.find(m => m.model === selectedModel) ?? null

  return {
    // 流程
    stepIndex, activeTool, activeDef, handleSelectTool,
    // 圖片輸入（上傳 + 從作品選）
    imageUrlsPreview, imageUrlsUrl, imageUrlsStatus, handleImageUrlsChange,
    worksPickerOpen, setWorksPickerOpen, handlePickWork,
    // 引擎選擇（可配置清單，按工具過濾，不寫死）
    toolModels, modelOptions, selectedModel, selectedInfo, handleSelectModel,
    paramValues, handleParamChange, extraPrompt, setExtraPrompt,
    // 處理
    isGenerating, jobDisplayStatus, canGenerate, handleGenerate,
    resultUrl, resultType, resultOutputs, resultTaskId, resultUsage,
    lastInputUrl, splitPos, setSplitPos,
    errorMsg, setErrorMsg, needsLogin, setNeedsLogin,
    // 流水線
    pipelineSteps, handleContinuePipeline, handleResetAll,
    // 結果操作
    handleDownload, handleSaveWork, savedKeys, lastWorkId,
    // 歷史 / 側邊欄
    genHistory, historyLoading, resumingJobIds,
    handleUpdateHistory, handleDeleteHistory, handleRestoreHistory,
    sidebarWorks, handleRemoveLocalWork, handleShowWork, localWorks,
    // 價格 + 計費確認
    priceText, priceLoading,
    account, setAccount,
    toast,
    ...costConfirm,
  }
}
