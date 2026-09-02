import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { listAigcModels } from '@/lib/aigc'
import type { AigcModelInfo } from '@/lib/aigc'
import { listLlmModels } from '@/lib/llm'
import type { LlmModelInfo } from '@/lib/llm'
import { onLocalAccountChange } from '@/lib/localAuth'
import type { LocalAccount } from '@/lib/localAuth'
import {
  defaultPrefs,
  groupDefaultModel,
  groupOfAigcModel,
  loadPrefs,
  savePrefs,
} from '@/lib/modelPrefs'
import type { ModelPrefsData, PrefGroup } from '@/lib/modelPrefs'
import { MODEL_META as IMG_MODEL_META } from '@/pages/ModelGen/useModelGen'
import { MODEL_META as TOOL_MODEL_META } from '@/pages/Tools/useTools'
import { ENGINE_META as VIDEO_ENGINE_META } from '@/pages/Video/useVideo'
import { LLM_MODEL_META } from '@/pages/Copywriting/useCopywriting'

export type SavePhase = 'idle' | 'saving' | 'saved' | 'error'

export interface SettingsEngine {
  slug: string
  displayName: string
  priceHint: string
  useHint: string
}

export interface SettingsGroupView {
  group: PrefGroup
  title: string
  tagline: string
  engines: SettingsEngine[]
}

const GROUP_DEFS: { group: PrefGroup; title: string; tagline: string }[] = [
  { group: 'image-edit', title: '生圖 / 修圖', tagline: '模特圖、商品圖、去背景去水印都走這組引擎' },
  { group: 'video-gen', title: '生視頻', tagline: '商品主圖視頻、種草短視頻的畫面動效' },
  { group: 'upscale', title: '圖像放大', tagline: '低清圖高清修復，放大不糊' },
  { group: 'writing', title: '寫作', tagline: '營銷文案、詳情頁、分鏡腳本的文字生成' },
]

// 每個引擎的一句話用途說明（展示文案；未知引擎用分組兜底文案）
const USE_HINTS: Record<string, string> = {
  'seedream-4.5-white': '適合商品主圖與參考圖生成',
  'seedance-1-5-pro-white': '適合商品圖生視頻與鏡頭動效',
  'gpt-5.5': '旗艦寫作，文案細節與賣點拿捏更到位',
}

const GROUP_FALLBACK_HINT: Record<PrefGroup, string> = {
  'image-edit': '生圖 / 修圖引擎，按提示詞改圖',
  'video-gen': '圖生視頻引擎，讓商品圖動起來',
  upscale: '圖像放大引擎，提升清晰度',
  writing: '文字生成引擎，按用量計費',
}

function metaOf(slug: string): { displayName: string; priceHint: string } | null {
  return IMG_MODEL_META[slug] ?? TOOL_MODEL_META[slug] ?? VIDEO_ENGINE_META[slug] ?? LLM_MODEL_META[slug] ?? null
}

function clonePrefs(p: ModelPrefsData): ModelPrefsData {
  return {
    aigc_defaults: { ...p.aigc_defaults },
    llm_defaults: { ...p.llm_defaults },
    aigc_disabled: [...p.aigc_disabled],
    llm_disabled: [...p.llm_disabled],
  }
}

export function useSettings() {
  const [aigcModels, setAigcModels] = useState<AigcModelInfo[]>([])
  const [llmModels, setLlmModels] = useState<LlmModelInfo[]>([])
  const [prefs, setPrefs] = useState<ModelPrefsData>(defaultPrefs())
  const [prefsReady, setPrefsReady] = useState(false)
  const [account, setAccount] = useState<LocalAccount | null>(null)
  const [savePhase, setSavePhase] = useState<SavePhase>('idle')
  const [toast, setToast] = useState<string | null>(null)

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 引擎清單：一份 aigc（生圖/生視頻/放大），一份 llm（寫作）
  useEffect(() => {
    Promise.all([listAigcModels(), listLlmModels()]).then(([aigcList, llmList]) => {
      setAigcModels(aigcList)
      setLlmModels(llmList)
    })
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  // 登錄態變化（含首次進入）：重新讀設置——登錄讀雲端（雲端優先），未登錄讀本機
  useEffect(() => {
    const unsubscribe = onLocalAccountChange(acc => {
      setAccount(acc)
      loadPrefs(true).then(loaded => {
        setPrefs(loaded)
        setPrefsReady(true)
      })
    }, true)
    return unsubscribe
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 2600)
  }

  // 改動即時保存（防抖 600ms）：本機總是落一份，登錄用戶同步雲端
  const applyChange = useCallback((next: ModelPrefsData) => {
    setPrefs(next)
    setSavePhase('saving')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      savePrefs(next)
        .then(() => {
          setSavePhase('saved')
          if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
          savedTimerRef.current = setTimeout(() => setSavePhase('idle'), 2200)
        })
        .catch(() => {
          setSavePhase('error')
          showToast('保存沒成功，改動仍留在本機')
        })
    }, 600)
  }, [])

  function handleSetDefault(group: PrefGroup, slug: string) {
    const next = clonePrefs(prefs)
    if (group === 'writing') {
      next.llm_defaults = { ...next.llm_defaults, writing: slug }
      next.llm_disabled = next.llm_disabled.filter(s => s !== slug)
    } else {
      next.aigc_defaults = { ...next.aigc_defaults, [group]: slug }
      next.aigc_disabled = next.aigc_disabled.filter(s => s !== slug)
    }
    applyChange(next)
    showToast('已更新默認引擎，全站各頁生效')
  }

  function handleToggleEngine(group: PrefGroup, slug: string) {
    const disabledList = group === 'writing' ? prefs.llm_disabled : prefs.aigc_disabled
    const isDisabled = disabledList.includes(slug)
    if (!isDisabled && groupDefaultModel(group, prefs) === slug) {
      showToast('默認引擎需保持啓用，先切換默認再停用它')
      return
    }
    const next = clonePrefs(prefs)
    if (group === 'writing') {
      next.llm_disabled = isDisabled ? next.llm_disabled.filter(s => s !== slug) : [...next.llm_disabled, slug]
    } else {
      next.aigc_disabled = isDisabled ? next.aigc_disabled.filter(s => s !== slug) : [...next.aigc_disabled, slug]
    }
    applyChange(next)
    showToast(isDisabled ? '已啓用該引擎' : '已在各頁選擇清單中隱藏該引擎')
  }

  function handleReset() {
    applyChange(defaultPrefs())
    showToast('已恢復出廠默認設置')
  }

  const groups = useMemo<SettingsGroupView[]>(() => {
    return GROUP_DEFS.map(def => {
      const slugs =
        def.group === 'writing'
          ? llmModels.map(m => m.model)
          : aigcModels.filter(m => groupOfAigcModel(m) === def.group).map(m => m.model)
      const engines: SettingsEngine[] = slugs.map(slug => {
        const meta = metaOf(slug)
        return {
          slug,
          displayName: meta?.displayName ?? slug,
          priceHint: meta?.priceHint ?? '按實際扣費',
          useHint: USE_HINTS[slug] ?? GROUP_FALLBACK_HINT[def.group],
        }
      })
      return { group: def.group, title: def.title, tagline: def.tagline, engines }
    })
  }, [aigcModels, llmModels])

  return {
    groups,
    prefs,
    prefsReady,
    listLoading: aigcModels.length === 0 && llmModels.length === 0,
    loggedIn: !!account,
    savePhase,
    toast,
    groupDefaultOf: (group: PrefGroup) => groupDefaultModel(group, prefs),
    isEngineDisabled: (group: PrefGroup, slug: string) =>
      (group === 'writing' ? prefs.llm_disabled : prefs.aigc_disabled).includes(slug),
    handleSetDefault,
    handleToggleEngine,
    handleReset,
  }
}
