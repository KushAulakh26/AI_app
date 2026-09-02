import { useState, useEffect, useMemo, useRef } from 'react'
import { callLlmWithFallback, listLlmModels, LLM_PROVIDER_NOT_CONFIGURED } from '@/lib/llm'
import { applyPrefsToModels, loadPrefs } from '@/lib/modelPrefs'
import type { LlmMessage, LlmModelInfo, LlmCallResult } from '@/lib/llm'
import { useCostConfirm } from '@/hooks/useCostConfirm'
import { loadLocalWorks,
  hydrateWorksFromCloud,
  onWorksChanged, appendLocalWork, toggleWorkSaved, removeLocalWorkById, type LocalWork } from '@/lib/localWorks'

export const DEFAULT_LLM_MODEL = 'gpt-5.5'
const LLM_LOCAL_PREFIX = 'llm:'

// 展示名與計費提示（清單本身來自後端 GET /api/llm/models，這裏只補展示文案）
export const LLM_MODEL_META: Record<string, { displayName: string; priceHint: string }> = {
  'gpt-5.5': { displayName: 'GPT-5.5 · 旗艦寫作', priceHint: '按 token 計費 · 默認' },
  'gpt-5.4': { displayName: 'GPT-5.4 · 快速寫作', priceHint: '按 token 計費 · 更省' },
  'qwen3.7-max': { displayName: '通義千問3.7-Max', priceHint: '按 token 計費 · 實惠' },
  'gpt-5.4-pro': { displayName: 'GPT-5.4-Pro · 高階寫作', priceHint: '按 token 計費 · 高階' },
}

export function llmModelMetaOf(modelName: string) {
  return LLM_MODEL_META[modelName] ?? { displayName: modelName, priceHint: '按 token 計費' }
}

export const PLATFORM_STYLES: { id: string; label: string; desc: string }[] = [
  { id: 'xiaohongshu', label: '小紅書種草', desc: '第一人稱體驗感筆記 + 話題標籤' },
  { id: 'taobao', label: '淘寶詳情頁', desc: '開場鉤子 / 賣點詳解 / 場景 / 行動' },
  { id: 'video', label: '短視頻口播', desc: '30 秒口播稿，前 3 秒抓人' },
  { id: 'moments', label: '朋友圈', desc: '百字以內，像真人隨手推薦' },
]

const SYSTEM_PROMPT =
  '你是一位資深電商營銷文案專家，擅長寫出貼合平臺調性、能帶動轉化的帶貨文案。只輸出文案正文本身，不要輸出任何解釋、前綴或引號。'

export type SlotStatus = 'running' | 'success' | 'failed'

export interface CopySlot {
  slotId: string
  label: string
  category: '整套文案' | '平臺文案'
  jobStatus: SlotStatus
  text: string | null
  errorText: string | null
  modelName: string
  rewritten: boolean
}

export interface HistoryCopyItem {
  key: string
  label: string
  productName: string
  text: string
  timeLabel: string
  modelName: string
  saved: boolean
}

export interface RestoredCopy {
  label: string
  productName: string
  text: string
  timeLabel: string
}

// 官方錯誤碼 → 中文文案（lib 契約提供的映射，不自己發明白名單）
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
  promo: string
}

function buildProductContext(b: BriefInput): string {
  return [
    `商品名稱：${b.productName.trim()}`,
    `核心賣點：${b.sellingPoints.trim()}`,
    b.audience.trim() ? `目標人羣：${b.audience.trim()}` : '',
    b.promo.trim() ? `促銷信息：${b.promo.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

const PLATFORM_PROMPTS: Record<string, (ctx: string) => string> = {
  xiaohongshu: ctx =>
    `根據下面商品信息寫一段小紅書種草筆記。\n${ctx}\n要求：含 1 個標題（20字內，可帶表情），正文用第一人稱體驗口吻、自然使用表情符號、150-250字，結尾給4-6個以#開頭的話題標籤。只輸出筆記內容。`,
  taobao: ctx =>
    `根據下面商品信息寫淘寶詳情頁文案。\n${ctx}\n要求：按「開場鉤子」「賣點詳解」「使用場景」「行動號召」四段組織，每段以【段落名】開頭單獨成段，突出轉化。只輸出詳情頁文案。`,
  video: ctx =>
    `根據下面商品信息寫短視頻口播腳本。\n${ctx}\n要求：約30秒口播、口語化，前3秒用懸念或痛點鉤子，結尾引導點贊或下單。只輸出口播稿。`,
  moments: ctx =>
    `根據下面商品信息寫一條朋友圈帶貨文案。\n${ctx}\n要求：100字以內，像真實用戶隨手分享的自然推薦，不生硬，可帶少量表情。只輸出朋友圈文案。`,
}

export function useCopywriting() {
  // --- 商品信息表單 ---
  const [productName, setProductName] = useState('')
  const [sellingPoints, setSellingPoints] = useState('')
  const [audience, setAudience] = useState('')
  const [promo, setPromo] = useState('')

  // --- 生成方式：一鍵整套 + 平臺風格多選 ---
  const [fullSetOn, setFullSetOn] = useState(true)
  const [selectedPlatformIds, setSelectedPlatformIds] = useState<string[]>(['xiaohongshu'])

  // --- 模型選擇（清單來自後端，不寫死單一模型） ---
  const [modelOptions, setModelOptions] = useState<LlmModelInfo[]>([])
  const [modelsState, setModelsState] = useState<'loading' | 'ready' | 'unconfigured'>('loading')
  const [selectedModel, setSelectedModel] = useState(DEFAULT_LLM_MODEL)

  // --- 併發生成槽位 ---
  const [copySlots, setCopySlots] = useState<CopySlot[]>([])
  const [restoredCopy, setRestoredCopy] = useState<RestoredCopy | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [needsLogin, setNeedsLogin] = useState(false)

  // --- 本地歷史（未登錄可用） ---
  const [localWorks, setLocalWorks] = useState<LocalWork[]>([])
  const [savedKeys, setSavedKeys] = useState<string[]>([])

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
      if (!list.length) { setModelsState('unconfigured'); showToast(LLM_PROVIDER_NOT_CONFIGURED); return }
      // 應用全站引擎設置（寫作組）：過濾停用引擎 + 默認引擎排最前
      const prefs = await loadPrefs()
      const visible = applyPrefsToModels(list, 'writing', prefs)
      if (!visible.length) { setModelsState('unconfigured'); showToast(LLM_PROVIDER_NOT_CONFIGURED); return }
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

  function handleTogglePlatform(id: string) {
    setSelectedPlatformIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  }

  function handleToggleFullSet() {
    setFullSetOn(v => !v)
  }

  function handleSelectModel(modelName: string) {
    setSelectedModel(modelName)
  }

  function buildSlotPlans(): { label: string; category: CopySlot['category']; userPrompt: string }[] {
    const brief: BriefInput = { productName, sellingPoints, audience, promo }
    const ctx = buildProductContext(brief)
    const plans: { label: string; category: CopySlot['category']; userPrompt: string }[] = []
    if (fullSetOn) {
      plans.push(
        {
          label: '商品標題',
          category: '整套文案',
          userPrompt: `根據下面商品信息寫一個電商商品標題。\n${ctx}\n要求：30字以內，核心賣點前置、吸睛且利於搜索。只輸出標題文字，只給一版。`,
        },
        {
          label: '賣點清單',
          category: '整套文案',
          userPrompt: `根據下面商品信息提煉核心賣點清單。\n${ctx}\n要求：4-6條賣點，每條12字以內，逐條以「·」開頭單獨成行。只輸出清單內容。`,
        },
        {
          label: '營銷正文',
          category: '整套文案',
          userPrompt: `根據下面商品信息寫一段營銷正文。\n${ctx}\n要求：150-250字，先講痛點場景，再帶出產品體驗，最後給下單理由。只輸出正文。`,
        },
      )
    }
    for (const id of selectedPlatformIds) {
      const style = PLATFORM_STYLES.find(s => s.id === id)
      const builder = PLATFORM_PROMPTS[id]
      if (!style || !builder) continue
      plans.push({ label: style.label, category: '平臺文案', userPrompt: builder(ctx) })
    }
    return plans
  }

  function applySlotOutcome(slotId: string, res: LlmCallResult, workLabel: string, modelName: string) {
    if (res.status === 'success' && res.text) {
      setCopySlots(prev => prev.map(s => (s.slotId === slotId ? { ...s, jobStatus: 'success', text: res.text } : s)))
      const work: LocalWork = {
        id: slotId,
        url: res.text,
        createdIso: new Date().toISOString(),
        modeLabel: workLabel,
        modelName: `${LLM_LOCAL_PREFIX}${modelName}`,
        prompt: productName.trim(),
        taskId: null,
      }
      setLocalWorks(appendLocalWork(work))
    } else {
      if (res.needsLogin) setNeedsLogin(true)
      const detail = zhLlmError(res)
      setCopySlots(prev => prev.map(s => (s.slotId === slotId ? { ...s, jobStatus: 'failed', errorText: detail } : s)))
      setErrorMsg(detail)
    }
  }

  async function runGeneration() {
    const modelName = selectedModel
    const plans = buildSlotPlans()
    if (!plans.length) return
    const stamped: CopySlot[] = plans.map((pl, i) => ({
      slotId: `slot-${Date.now()}-${i}`,
      label: pl.label,
      category: pl.category,
      jobStatus: 'running',
      text: null,
      errorText: null,
      modelName,
      rewritten: false,
    }))
    setCopySlots(stamped)
    setRestoredCopy(null)
    setErrorMsg(null)

    await Promise.all(
      stamped.map(async (slot, i) => {
        const plan = plans[i]
        if (i > 0) await new Promise(r => setTimeout(r, i * 350))
        const messages: LlmMessage[] = [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: plan.userPrompt },
        ]
        const res = await callLlmWithFallback(modelName, { messages, page: 'copywriting' })
        applySlotOutcome(slot.slotId, res, slot.label, modelName)
      }),
    )
  }

  const taskCount = (fullSetOn ? 3 : 0) + selectedPlatformIds.length
  const isGenerating = copySlots.some(s => s.jobStatus === 'running')
  const canGenerate =
    productName.trim().length > 0 && sellingPoints.trim().length > 0 && taskCount > 0 && !isGenerating

  function handleGenerate() {
    if (!canGenerate) return
    const priceText = `本次併發 ${taskCount} 條文案任務，按實際 token 消耗扣費`
    costConfirm.runWithCostConfirm(runGeneration, priceText)
  }

  async function runRewrite(slotId: string, originalText: string, label: string, modelName: string) {
    setCopySlots(prev => prev.map(s => (s.slotId === slotId ? { ...s, jobStatus: 'running', errorText: null } : s)))
    const messages: LlmMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `請把下面這段「${label}」文案換一種表達風格重寫：核心信息與篇幅量級保持不變，語言更有吸引力。\n原文：\n${originalText}\n只輸出重寫後的結果。`,
      },
    ]
    const res = await callLlmWithFallback(modelName, { messages, page: 'copywriting' })
    if (res.status === 'success' && res.text) {
      setCopySlots(prev =>
        prev.map(s => (s.slotId === slotId ? { ...s, jobStatus: 'success', text: res.text, rewritten: true } : s)),
      )
      showToast('已爲你改寫一版')
    } else {
      if (res.needsLogin) setNeedsLogin(true)
      const detail = zhLlmError(res)
      setCopySlots(prev => prev.map(s => (s.slotId === slotId ? { ...s, jobStatus: 'failed', errorText: detail } : s)))
      setErrorMsg(detail)
    }
  }

  function handleRewriteSlot(slotId: string) {
    const slot = copySlots.find(s => s.slotId === slotId)
    if (!slot || slot.jobStatus !== 'success' || !slot.text) return
    const originalText = slot.text
    costConfirm.runWithCostConfirm(() => {
      void runRewrite(slotId, originalText, slot.label, slot.modelName)
    }, '改寫一次，按實際 token 消耗扣費')
  }

  function handleRetrySlot(slotId: string) {
    const slot = copySlots.find(s => s.slotId === slotId)
    if (!slot || slot.jobStatus === 'running') return
    costConfirm.runWithCostConfirm(() => {
      void runSingleSlot(slot.slotId, slot.label, slot.category, slot.modelName)
    }, '重試一條，按實際 token 消耗扣費')
  }

  async function runSingleSlot(slotId: string, label: string, category: CopySlot['category'], modelName: string) {
    const plans = buildSlotPlans().filter(pl => pl.label === label && pl.category === category)
    const plan = plans[0]
    if (!plan) return
    setCopySlots(prev => prev.map(s => (s.slotId === slotId ? { ...s, jobStatus: 'running', errorText: null } : s)))
    const messages: LlmMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: plan.userPrompt },
    ]
    const res = await callLlmWithFallback(modelName, { messages, page: 'copywriting' })
    applySlotOutcome(slotId, res, label, modelName)
  }

  function copyText(text: string, doneMsg = '已複製到剪貼板') {
    if (!text) return
    navigator.clipboard
      ?.writeText(text)
      .then(() => showToast(doneMsg))
      .catch(() => showToast('複製失敗，請長按文案手動複製'))
  }

  function handleCopySlot(slotId: string) {
    const slot = copySlots.find(s => s.slotId === slotId)
    if (slot?.text) copyText(slot.text)
  }

  function handleSaveSlot(slotId: string) {
    if (savedKeys.includes(slotId)) return
    setLocalWorks(toggleWorkSaved(slotId))
    setSavedKeys(prev => [...prev, slotId])
    showToast('已保存到我的作品')
  }

  function handleClearRestored() {
    setRestoredCopy(null)
  }

  function handleCopyRestored() {
    if (restoredCopy?.text) copyText(restoredCopy.text)
  }

  // --- 本地歷史（只取文案類，避開其它頁面的圖片作品） ---
  const copyHistory = useMemo<HistoryCopyItem[]>(
    () =>
      localWorks
        .filter(w => w.modelName.startsWith(LLM_LOCAL_PREFIX))
        .map(w => ({
          key: w.id,
          label: w.modeLabel,
          productName: w.prompt,
          text: w.url,
          timeLabel: formatTimeLabel(w.createdIso),
          modelName: w.modelName.slice(LLM_LOCAL_PREFIX.length),
          saved: !!w.saved,
        })),
    [localWorks],
  )

  function handleShowHistory(item: HistoryCopyItem) {
    setRestoredCopy({ label: item.label, productName: item.productName, text: item.text, timeLabel: item.timeLabel })
    setCopySlots([])
  }

  function handleCopyHistory(item: HistoryCopyItem) {
    copyText(item.text)
  }

  function handleRemoveHistory(key: string) {
    setLocalWorks(removeLocalWorkById(key))
    showToast('已刪除該記錄')
  }

  return {
    // 表單
    productName, setProductName,
    sellingPoints, setSellingPoints,
    audience, setAudience,
    promo, setPromo,
    // 生成方式
    fullSetOn, handleToggleFullSet,
    selectedPlatformIds, handleTogglePlatform,
    // 模型（可配置清單，不寫死）
    modelOptions, selectedModel, handleSelectModel, modelsState,
    // 生成
    isGenerating, canGenerate, taskCount, handleGenerate,
    copySlots, handleRetrySlot, handleRewriteSlot, handleCopySlot, handleSaveSlot, savedKeys,
    restoredCopy, handleClearRestored, handleCopyRestored,
    errorMsg, needsLogin,
    // 歷史側邊欄
    copyHistory, handleShowHistory, handleCopyHistory, handleRemoveHistory,
    // 輕提示 + 計費確認
    toast,
    ...costConfirm,
  }
}
