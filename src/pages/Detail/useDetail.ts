import { useState, useEffect, useMemo, useRef } from 'react'
import { callLlmWithFallback, listLlmModels, LLM_PROVIDER_NOT_CONFIGURED } from '@/lib/llm'
import { applyPrefsToModels, loadPrefs } from '@/lib/modelPrefs'
import { isUsableMediaUrl } from '@/lib/aigc'
import type { LlmMessage, LlmModelInfo, LlmCallResult } from '@/lib/llm'
import { useCostConfirm } from '@/hooks/useCostConfirm'
import { loadLocalWorks,
  hydrateWorksFromCloud,
  onWorksChanged, appendLocalWork, toggleWorkSaved, removeLocalWorkById, type LocalWork } from '@/lib/localWorks'
import { DEFAULT_LLM_MODEL, llmModelMetaOf } from '@/pages/Copywriting/useCopywriting'

export { llmModelMetaOf }

const DETAIL_LOCAL_PREFIX = 'detail:'

const SYSTEM_PROMPT =
  '你是一位資深電商詳情頁文案專家，擅長按詳情頁版塊結構寫出高轉化的商品文案。只輸出文案正文本身，不要輸出任何解釋、前綴或引號。'

export type BlockStatus = 'running' | 'success' | 'failed'

export interface DetailBlockSlot {
  blockId: string
  label: string
  jobStatus: BlockStatus
  text: string | null
  errorText: string | null
  modelName: string
  rewritten: boolean
}

export interface LayoutImage {
  imageId: string
  url: string
  sourceLabel: string
}

export interface HistoryDetailItem {
  key: string
  productName: string
  timeLabel: string
  modelName: string
  saved: boolean
  blockTexts: { blockId: string; label: string; text: string }[]
  imageUrls: string[]
}

interface BlockDef {
  blockId: string
  label: string
  hint: string
}

export const BLOCK_DEFS: BlockDef[] = [
  { blockId: 'hero-title', label: '主圖標題', hint: '印在主圖上的一句話賣點' },
  { blockId: 'selling-points', label: '賣點模塊', hint: '4-6 條小標題 + 說明' },
  { blockId: 'spec-params', label: '規格參數', hint: '參數名 + 參數值列表' },
  { blockId: 'detail-desc', label: '詳情描述', hint: '場景 + 體驗 + 下單理由' },
]

const BLOCK_PROMPTS: Record<string, (ctx: string) => string> = {
  'hero-title': ctx =>
    `根據下面商品信息寫電商詳情頁的主圖標題。\n${ctx}\n要求：20字以內，一句話點出核心賣點，醒目、適合印在主圖上。只輸出標題文字，只給一版。`,
  'selling-points': ctx =>
    `根據下面商品信息提煉詳情頁的賣點模塊。\n${ctx}\n要求：4-6條賣點，每條單獨一行，格式「小標題｜一句話說明」，小標題6字以內，說明20字以內。只輸出賣點模塊內容。`,
  'spec-params': ctx =>
    `根據下面商品信息寫詳情頁的規格參數列表。\n${ctx}\n要求：6-10條，每條單獨一行，格式「參數名：參數值」；商品信息裏沒給出的參數按該品類常見規格合理補全。只輸出參數列表。`,
  'detail-desc': ctx =>
    `根據下面商品信息寫詳情頁的詳情描述正文。\n${ctx}\n要求：150-300字，先講使用場景與痛點，再展開產品體驗，最後給下單理由。只輸出正文。`,
}

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

interface BriefInput {
  productName: string
  sellingPoints: string
  audience: string
  specs: string
}

function buildProductContext(b: BriefInput): string {
  return [
    `商品名稱：${b.productName.trim()}`,
    `核心賣點：${b.sellingPoints.trim()}`,
    b.audience.trim() ? `目標人羣：${b.audience.trim()}` : '',
    b.specs.trim() ? `規格參數：${b.specs.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function parseDetailPayload(raw: string): { blockTexts: HistoryDetailItem['blockTexts']; imageUrls: string[] } {
  try {
    const parsed = JSON.parse(raw) as { blocks?: unknown; imageUrls?: unknown }
    const blockTexts = Array.isArray(parsed.blocks)
      ? (parsed.blocks as HistoryDetailItem['blockTexts']).filter(
          x => x && typeof x.blockId === 'string' && typeof x.text === 'string',
        )
      : []
    const imageUrls = Array.isArray(parsed.imageUrls)
      ? (parsed.imageUrls as unknown[]).filter(isUsableMediaUrl)
      : []
    return { blockTexts, imageUrls }
  } catch {
    return { blockTexts: [], imageUrls: [] }
  }
}

export function useDetail() {
  // --- 商品信息表單 ---
  const [productName, setProductName] = useState('')
  const [sellingPoints, setSellingPoints] = useState('')
  const [audience, setAudience] = useState('')
  const [specs, setSpecs] = useState('')

  // --- 模型選擇（清單來自後端，不寫死單一模型） ---
  const [modelOptions, setModelOptions] = useState<LlmModelInfo[]>([])
  const [modelsState, setModelsState] = useState<'loading' | 'ready' | 'unconfigured'>('loading')
  const [selectedModel, setSelectedModel] = useState(DEFAULT_LLM_MODEL)

  // --- 四區塊併發生成 ---
  const [detailSlots, setDetailSlots] = useState<DetailBlockSlot[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [needsLogin, setNeedsLogin] = useState(false)

  // --- 圖片排版（選作品圖 + 本地上傳，純前端操作） ---
  const [layoutImages, setLayoutImages] = useState<LayoutImage[]>([])

  // --- 本地歷史（未登錄可用） ---
  const [localWorks, setLocalWorks] = useState<LocalWork[]>([])
  const [savedAll, setSavedAll] = useState(false)
  const lastHistoryIdRef = useRef<string | null>(null)

  // --- 輕提示 ---
  const [toast, setToast] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // --- 計費確認 ---
  const costConfirm = useCostConfirm()

  // 作品歷史以雲端為準：進頁時從 PocketBase 灌回，並訂閱後續變動。
  // 這樣換一台電腦登入也看得到自己的作品，而不是綁在這台瀏覽器。
  useEffect(() => {
    void hydrateWorksFromCloud().then(setLocalWorks)
    return onWorksChanged(() => setLocalWorks(loadLocalWorks()))
  }, [])

  useEffect(() => {
    setLocalWorks(loadLocalWorks())
    listLlmModels().then(async list => {
      if (!list.length) { setModelsState('unconfigured'); setErrorMsg(LLM_PROVIDER_NOT_CONFIGURED); return }
      // 應用全站引擎設置（寫作組）：過濾停用引擎 + 默認引擎排最前
      const prefs = await loadPrefs()
      const visible = applyPrefsToModels(list, 'writing', prefs)
      if (!visible.length) { setModelsState('unconfigured'); setErrorMsg(LLM_PROVIDER_NOT_CONFIGURED); return }
      setModelsState('ready')
      setModelOptions(visible)
      setSelectedModel(prev => (visible.some(m => m.model === prev) ? prev : visible[0].model))
    })
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 2400)
  }

  function handleSelectModel(modelName: string) {
    setSelectedModel(modelName)
  }

  // ---------------- 文案區塊生成 ----------------

  function applyBlockOutcome(blockId: string, res: LlmCallResult) {
    if (res.status === 'success' && res.text) {
      setDetailSlots(prev => prev.map(s => (s.blockId === blockId ? { ...s, jobStatus: 'success', text: res.text } : s)))
    } else {
      if (res.needsLogin) setNeedsLogin(true)
      const detail = zhLlmError(res)
      setDetailSlots(prev => prev.map(s => (s.blockId === blockId ? { ...s, jobStatus: 'failed', errorText: detail } : s)))
      setErrorMsg(detail)
    }
  }

  function buildBlockMessages(blockId: string): LlmMessage[] {
    const ctx = buildProductContext({ productName, sellingPoints, audience, specs })
    const builder = BLOCK_PROMPTS[blockId]
    return [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: builder ? builder(ctx) : '' },
    ]
  }

  async function runGeneration() {
    const modelName = selectedModel
    const nameSnapshot = productName.trim()
    const imagesSnapshot = layoutImages.map(x => x.url).filter(isUsableMediaUrl)
    setDetailSlots(
      BLOCK_DEFS.map(d => ({
        blockId: d.blockId,
        label: d.label,
        jobStatus: 'running',
        text: null,
        errorText: null,
        modelName,
        rewritten: false,
      })),
    )
    setSavedAll(false)
    setErrorMsg(null)

    const outcomes: { blockId: string; label: string; text: string }[] = []
    await Promise.all(
      BLOCK_DEFS.map(async (d, i) => {
        if (i > 0) await new Promise(r => setTimeout(r, i * 350))
        const res = await callLlmWithFallback(modelName, { messages: buildBlockMessages(d.blockId), page: 'detail' })
        if (res.status === 'success' && res.text) outcomes.push({ blockId: d.blockId, label: d.label, text: res.text })
        applyBlockOutcome(d.blockId, res)
      }),
    )

    // 生成完自動進歷史記錄（部分失敗不影響成功區塊入檔）
    if (outcomes.length) {
      const payload = JSON.stringify({ productName: nameSnapshot, blocks: outcomes, imageUrls: imagesSnapshot })
      const workId = `detail-${Date.now()}`
      const work: LocalWork = {
        id: workId,
        url: payload,
        createdIso: new Date().toISOString(),
        modeLabel: '商品詳情頁',
        modelName: `${DETAIL_LOCAL_PREFIX}${modelName}`,
        prompt: nameSnapshot,
        taskId: null,
      }
      lastHistoryIdRef.current = workId
      setLocalWorks(appendLocalWork(work))
    }
  }

  const isGenerating = detailSlots.some(s => s.jobStatus === 'running')
  const canGenerate = productName.trim().length > 0 && sellingPoints.trim().length > 0 && !isGenerating

  function handleGenerate() {
    if (!canGenerate) return
    costConfirm.runWithCostConfirm(runGeneration, '本次併發生成 4 個文案區塊，按實際 token 消耗扣費')
  }

  async function runSingleBlock(blockId: string, modelName: string) {
    setDetailSlots(prev => prev.map(s => (s.blockId === blockId ? { ...s, jobStatus: 'running', errorText: null } : s)))
    const res = await callLlmWithFallback(modelName, { messages: buildBlockMessages(blockId), page: 'detail' })
    applyBlockOutcome(blockId, res)
  }

  function handleRetryBlock(blockId: string) {
    const slot = detailSlots.find(s => s.blockId === blockId)
    if (!slot || slot.jobStatus === 'running') return
    costConfirm.runWithCostConfirm(() => {
      void runSingleBlock(blockId, slot.modelName)
    }, '重試一個區塊，按實際 token 消耗扣費')
  }

  async function runRewrite(blockId: string, originalText: string, label: string, modelName: string) {
    setDetailSlots(prev => prev.map(s => (s.blockId === blockId ? { ...s, jobStatus: 'running', errorText: null } : s)))
    const messages: LlmMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `請把下面這段詳情頁「${label}」文案換一種表達風格重寫：核心信息與篇幅量級保持不變，語言更有吸引力。\n原文：\n${originalText}\n只輸出重寫後的結果。`,
      },
    ]
    const res = await callLlmWithFallback(modelName, { messages, page: 'detail' })
    if (res.status === 'success' && res.text) {
      setDetailSlots(prev =>
        prev.map(s => (s.blockId === blockId ? { ...s, jobStatus: 'success', text: res.text, rewritten: true } : s)),
      )
      showToast('已爲你改寫一版')
    } else {
      if (res.needsLogin) setNeedsLogin(true)
      const detail = zhLlmError(res)
      setDetailSlots(prev => prev.map(s => (s.blockId === blockId ? { ...s, jobStatus: 'failed', errorText: detail } : s)))
      setErrorMsg(detail)
    }
  }

  function handleRewriteBlock(blockId: string) {
    const slot = detailSlots.find(s => s.blockId === blockId)
    if (!slot || slot.jobStatus !== 'success' || !slot.text) return
    const originalText = slot.text
    costConfirm.runWithCostConfirm(() => {
      void runRewrite(blockId, originalText, slot.label, slot.modelName)
    }, '改寫一個區塊，按實際 token 消耗扣費')
  }

  function copyText(text: string, doneMsg = '已複製到剪貼板') {
    if (!text) return
    navigator.clipboard
      ?.writeText(text)
      .then(() => showToast(doneMsg))
      .catch(() => showToast('複製失敗，請長按文案手動複製'))
  }

  function handleCopyBlock(blockId: string) {
    const slot = detailSlots.find(s => s.blockId === blockId)
    if (slot?.text) copyText(slot.text)
  }

  function handleExportAll() {
    const done = detailSlots.filter(s => s.jobStatus === 'success' && s.text)
    if (!done.length) {
      showToast('還沒有可導出的文案')
      return
    }
    const head = productName.trim() ? `${productName.trim()}\n\n` : ''
    const body = done.map(s => `【${s.label}】\n${s.text}`).join('\n\n')
    copyText(head + body, '整篇文案已複製到剪貼板')
  }

  // ---------------- 圖片排版 ----------------

  // 「我的作品」裏其它頁面生成的圖片（排除文案/詳情頁文本記錄）
  const candidateImages = useMemo<LayoutImage[]>(
    () =>
      localWorks
        .filter(
          w =>
            !w.modelName.startsWith('llm:') &&
            !w.modelName.startsWith(DETAIL_LOCAL_PREFIX) &&
            isUsableMediaUrl(w.url),
        )
        .map(w => ({ imageId: w.id, url: w.url, sourceLabel: w.modeLabel })),
    [localWorks],
  )

  function handleToggleWorkImage(img: LayoutImage) {
    setLayoutImages(prev =>
      prev.some(x => x.imageId === img.imageId) ? prev.filter(x => x.imageId !== img.imageId) : [...prev, img],
    )
  }

  function handleUploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const added: LayoutImage[] = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .map((f, i) => ({
        imageId: `up-${Date.now()}-${i}`,
        url: URL.createObjectURL(f),
        sourceLabel: '本地上傳',
      }))
    if (!added.length) {
      showToast('只支持圖片文件')
      return
    }
    setLayoutImages(prev => [...prev, ...added])
    showToast(`已加入 ${added.length} 張圖片`)
  }

  function handleMoveImage(imageId: string, dir: -1 | 1) {
    setLayoutImages(prev => {
      const idx = prev.findIndex(x => x.imageId === imageId)
      const target = idx + dir
      if (idx < 0 || target < 0 || target >= prev.length) return prev
      const next = [...prev]
      const tmp = next[idx]
      next[idx] = next[target]
      next[target] = tmp
      return next
    })
  }

  function handleRemoveImage(imageId: string) {
    setLayoutImages(prev => prev.filter(x => x.imageId !== imageId))
  }

  // ---------------- 保存整套 + 歷史 ----------------

  function handleSaveAll() {
    const targetId = lastHistoryIdRef.current
    if (!targetId || savedAll) return
    setLocalWorks(toggleWorkSaved(targetId))
    setSavedAll(true)
    showToast('整套詳情頁已保存到我的作品')
  }

  const detailHistory = useMemo<HistoryDetailItem[]>(
    () =>
      localWorks
        .filter(w => w.modelName.startsWith(DETAIL_LOCAL_PREFIX))
        .map(w => {
          const { blockTexts, imageUrls } = parseDetailPayload(w.url)
          return {
            key: w.id,
            productName: w.prompt,
            timeLabel: formatTimeLabel(w.createdIso),
            modelName: w.modelName.slice(DETAIL_LOCAL_PREFIX.length),
            saved: !!w.saved,
            blockTexts,
            imageUrls,
          }
        }),
    [localWorks],
  )

  function handleShowHistory(item: HistoryDetailItem) {
    setDetailSlots(
      BLOCK_DEFS.map(d => {
        const found = item.blockTexts.find(b => b.blockId === d.blockId)
        return {
          blockId: d.blockId,
          label: d.label,
          jobStatus: found ? ('success' as BlockStatus) : ('failed' as BlockStatus),
          text: found ? found.text : null,
          errorText: found ? null : '該記錄未包含此區塊',
          modelName: item.modelName,
          rewritten: false,
        }
      }),
    )
    setLayoutImages(
      item.imageUrls.map((u, i) => ({ imageId: `his-${item.key}-${i}`, url: u, sourceLabel: '歷史圖片' })),
    )
    setSavedAll(false)
    lastHistoryIdRef.current = item.key
    setErrorMsg(null)
    showToast('已打開歷史記錄')
  }

  function handleRemoveHistory(key: string) {
    setLocalWorks(removeLocalWorkById(key))
    if (lastHistoryIdRef.current === key) {
      lastHistoryIdRef.current = null
      setSavedAll(false)
    }
    showToast('已刪除該記錄')
  }

  const hasPreviewContent = detailSlots.length > 0 || layoutImages.length > 0

  return {
    // 表單
    productName, setProductName,
    sellingPoints, setSellingPoints,
    audience, setAudience,
    specs, setSpecs,
    // 模型（可配置清單，不寫死）
    modelOptions, selectedModel, handleSelectModel, modelsState,
    // 生成
    isGenerating, canGenerate, handleGenerate,
    detailSlots, handleRetryBlock, handleRewriteBlock, handleCopyBlock,
    errorMsg, needsLogin,
    // 圖片排版
    candidateImages, layoutImages,
    handleToggleWorkImage, handleUploadFiles, handleMoveImage, handleRemoveImage,
    // 預覽 + 保存導出
    hasPreviewContent, handleSaveAll, savedAll, handleExportAll,
    // 歷史側邊欄
    detailHistory, handleShowHistory, handleRemoveHistory,
    // 輕提示 + 計費確認
    toast,
    ...costConfirm,
  }
}
