import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPocketBaseUrl } from '@/lib/pb'
import { getLocalAccount, localAuthHeaders, onLocalAccountChange, type LocalAccount } from '@/lib/localAuth'
import {
  classifyWorkKind,
  isVideoShotWork,
  loadLocalWorks,
  parseDetailPayload,
  parseVideoSetPayload,
  removeLocalWorkById,
  type DetailWorkPayload,
  type LocalWork,
  type VideoSetWorkPayload,
  type WorkKind,
} from '@/lib/localWorks'

export type WorkFilter = WorkKind | 'all'
export type WorkAssetType = 'image' | 'video' | 'text' | 'detail_set' | 'video_set'
export type ContinueTarget = 'scene' | 'video' | 'tools'
export type SyncPhase = 'idle' | 'syncing' | 'done' | 'error'

export interface WorkItem {
  workKey: string
  kind: WorkKind
  assetType: WorkAssetType
  title: string
  summary: string
  mediaUrl: string | null
  textContent: string | null
  detailPayload: DetailWorkPayload | null
  videoPayload: VideoSetWorkPayload | null
  createdIso: string
  source: 'local' | 'cloud'
  cloudId: string | null
  localId: string | null
}

export interface WorkFilterDef {
  id: WorkFilter
  label: string
}

interface CloudWorkRow {
  id: string
  created?: string
  updated?: string
  user_id?: string
  kind?: string
  asset_type?: string
  title?: string
  summary?: string
  content?: unknown
  media_urls?: unknown
  model_name?: string
  source_page?: string
  local_key?: string
  synced_from_local?: boolean
}

const VALID_KINDS: WorkKind[] = ['model', 'scene', 'copy', 'detail_set', 'video', 'tool']

export const WORK_FILTER_DEFS: WorkFilterDef[] = [
  { id: 'all', label: '全部' },
  { id: 'model', label: '模特圖' },
  { id: 'scene', label: '場景圖' },
  { id: 'copy', label: '文案' },
  { id: 'detail_set', label: '詳情頁' },
  { id: 'video', label: '視頻' },
  { id: 'tool', label: '圖片工具' },
]

function kindToSourcePage(kind: WorkKind): string {
  if (kind === 'model') return '/model-gen'
  if (kind === 'scene') return '/scene'
  if (kind === 'copy') return '/copywriting'
  if (kind === 'detail_set') return '/detail'
  if (kind === 'video') return '/video'
  return '/tools'
}

function localToItem(w: LocalWork): WorkItem {
  const kind = classifyWorkKind(w)
  let assetType: WorkAssetType = 'image'
  let mediaUrl: string | null = null
  let textContent: string | null = null
  let detailPayload: DetailWorkPayload | null = null
  let videoPayload: VideoSetWorkPayload | null = null
  if (kind === 'copy') {
    assetType = 'text'
    textContent = w.url || ''
  } else if (kind === 'detail_set') {
    assetType = 'detail_set'
    detailPayload = parseDetailPayload(w.url)
  } else if (kind === 'video') {
    if (isVideoShotWork(w)) {
      assetType = 'video'
      mediaUrl = /^https?:\/\//.test(w.url || '') ? w.url : null
    } else {
      assetType = 'video_set'
      videoPayload = parseVideoSetPayload(w.url)
    }
  } else {
    mediaUrl = /^https?:\/\//.test(w.url || '') ? w.url : null
  }
  return {
    workKey: `local-${w.id}`,
    kind,
    assetType,
    title: w.modeLabel || '創作',
    summary: w.prompt || '',
    mediaUrl,
    textContent,
    detailPayload,
    videoPayload,
    createdIso: w.createdIso,
    source: 'local',
    cloudId: null,
    localId: w.id,
  }
}

function pickMediaUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((u): u is string => typeof u === 'string' && /^https?:\/\//.test(u))
}

function rowToItem(row: CloudWorkRow): WorkItem {
  const kind = (VALID_KINDS.includes(row.kind as WorkKind) ? row.kind : 'model') as WorkKind
  const mediaUrls = pickMediaUrls(row.media_urls)
  let assetType: WorkAssetType = 'image'
  let mediaUrl: string | null = mediaUrls[0] || null
  let textContent: string | null = null
  let detailPayload: DetailWorkPayload | null = null
  let videoPayload: VideoSetWorkPayload | null = null
  if (kind === 'copy') {
    assetType = 'text'
    textContent = typeof row.content === 'string' ? row.content : ''
    mediaUrl = null
  } else if (kind === 'detail_set') {
    assetType = 'detail_set'
    if (row.content && typeof row.content === 'object') {
      detailPayload = parseDetailPayload(JSON.stringify(row.content))
    }
    mediaUrl = null
  } else if (kind === 'video') {
    if (row.asset_type === 'video_set') {
      assetType = 'video_set'
      if (row.content && typeof row.content === 'object') {
        videoPayload = parseVideoSetPayload(JSON.stringify(row.content))
      }
      mediaUrl = null
    } else {
      assetType = 'video'
    }
  }
  const createdIso =
    typeof row.created === 'string' && row.created ? new Date(row.created).toISOString() : new Date().toISOString()
  return {
    workKey: `cloud-${row.id}`,
    kind,
    assetType,
    title: row.title || '創作',
    summary: row.summary || '',
    mediaUrl,
    textContent,
    detailPayload,
    videoPayload,
    createdIso,
    source: 'cloud',
    cloudId: row.id,
    localId: row.local_key || null,
  }
}

function localToRowBody(w: LocalWork, userId: string): Record<string, unknown> {
  const item = localToItem(w)
  let content: unknown = null
  if (item.assetType === 'text') content = item.textContent || ''
  else if (item.assetType === 'detail_set') content = item.detailPayload
  else if (item.assetType === 'video_set') content = item.videoPayload
  return {
    user_id: userId,
    kind: item.kind,
    asset_type: item.assetType,
    title: item.title.slice(0, 200),
    summary: item.summary.slice(0, 200),
    content,
    media_urls: item.mediaUrl ? [item.mediaUrl] : [],
    model_name: (w.modelName || '').slice(0, 120),
    source_page: kindToSourcePage(item.kind),
    local_key: w.id,
    synced_from_local: true,
  }
}

function detailToText(payload: DetailWorkPayload): string {
  const lines = [`商品：${payload.productName || '未命名商品'}`, '']
  payload.blocks.forEach((b) => {
    lines.push(`【${b.label}】`, b.text, '')
  })
  return lines.join('\n')
}

function videoSetToText(payload: VideoSetWorkPayload): string {
  const lines = [`商品：${payload.productName || '未命名商品'}`, '']
  payload.shots.forEach((s) => {
    lines.push(`鏡頭 ${s.shotNo}`, `畫面：${s.visual}`, `臺詞：${s.dialogue}`, `時長：${s.duration}`, `配樂：${s.music}`, '')
  })
  return lines.join('\n')
}

export function useWorks() {
  const navigate = useNavigate()
  const [account, setAccount] = useState<LocalAccount | null>(() => getLocalAccount())
  const [genLocalWorks, setGenLocalWorks] = useState<LocalWork[]>(() => loadLocalWorks())
  const [cloudRows, setCloudRows] = useState<CloudWorkRow[]>([])
  const [activeFilter, setActiveFilter] = useState<WorkFilter>('all')
  const [pageLoadState, setPageLoadState] = useState<'loading' | 'ready'>('loading')
  const [syncPhase, setSyncPhase] = useState<SyncPhase>('idle')
  const [noticeText, setNoticeText] = useState<string | null>(null)
  const [activeWork, setActiveWork] = useState<WorkItem | null>(null)
  const [pendingDelete, setPendingDelete] = useState<WorkItem | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const syncSeqRef = useRef(0)
  const accountId = account ? account.id : null

  useEffect(() => {
    const unsubscribe = onLocalAccountChange((acc) => setAccount(acc), true)
    return unsubscribe
  }, [])

  const fetchCloudWorks = useCallback(async (userId: string): Promise<CloudWorkRow[]> => {
    const url = `${getPocketBaseUrl()}/api/cloud_works?user_id=${encodeURIComponent(userId)}&perPage=200`
    const res = await fetch(url, { headers: { ...localAuthHeaders() } })
    if (!res.ok) throw new Error(`works cloud load failed: ${res.status}`)
    const data = (await res.json()) as { items?: CloudWorkRow[] }
    return Array.isArray(data.items) ? data.items : []
  }, [])

  const createCloudWork = useCallback(async (body: Record<string, unknown>): Promise<void> => {
    const res = await fetch(`${getPocketBaseUrl()}/api/cloud_works`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...localAuthHeaders() },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`works cloud create failed: ${res.status}`)
  }, [])

  const runCloudSync = useCallback(
    async (userId: string) => {
      const seq = ++syncSeqRef.current
      setPageLoadState('loading')
      setNoticeText(null)
      try {
        const rows = await fetchCloudWorks(userId)
        if (seq !== syncSeqRef.current) return
        setCloudRows(rows)
        const syncedKeys = new Set(rows.map((r) => r.local_key || '').filter(Boolean))
        const locals = loadLocalWorks()
        setGenLocalWorks(locals)
        const missing = locals.filter((w) => !syncedKeys.has(w.id))
        if (!missing.length) {
          setSyncPhase('done')
          setPageLoadState('ready')
          return
        }
        setSyncPhase('syncing')
        const settled = await Promise.allSettled(missing.map((w) => createCloudWork(localToRowBody(w, userId))))
        if (seq !== syncSeqRef.current) return
        const okCount = settled.filter((s) => s.status === 'fulfilled').length
        if (okCount > 0) {
          const merged = await fetchCloudWorks(userId)
          if (seq !== syncSeqRef.current) return
          setCloudRows(merged)
        }
        if (okCount === missing.length) {
          setSyncPhase('done')
        } else {
          setSyncPhase('error')
          setNoticeText(okCount > 0 ? '還有 {count} 件本機作品沒同步上雲。'.replace('{count}', String(missing.length - okCount)) : '雲端同步出了點問題')
        }
      } catch {
        if (seq !== syncSeqRef.current) return
        setSyncPhase('error')
        setNoticeText('雲端同步出了點問題')
      }
      setPageLoadState('ready')
    },
    [createCloudWork, fetchCloudWorks],
  )

  useEffect(() => {
    if (!accountId) {
      syncSeqRef.current++
      setCloudRows([])
      setSyncPhase('idle')
      setPageLoadState('ready')
      return
    }
    void runCloudSync(accountId)
  }, [accountId, runCloudSync])

  const allItems = useMemo<WorkItem[]>(() => {
    if (!accountId) {
      return genLocalWorks.map(localToItem).sort((a, b) => b.createdIso.localeCompare(a.createdIso))
    }
    const cloudItems = cloudRows.map(rowToItem)
    const syncedKeys = new Set(cloudRows.map((r) => r.local_key || '').filter(Boolean))
    const unsyncedLocal = genLocalWorks.filter((w) => !syncedKeys.has(w.id)).map(localToItem)
    return [...cloudItems, ...unsyncedLocal].sort((a, b) => b.createdIso.localeCompare(a.createdIso))
  }, [accountId, cloudRows, genLocalWorks])

  const filterCounts = useMemo(() => {
    const counts: Record<WorkFilter, number> = {
      all: allItems.length,
      model: 0,
      scene: 0,
      copy: 0,
      detail_set: 0,
      video: 0,
      tool: 0,
    }
    allItems.forEach((item) => {
      counts[item.kind] += 1
    })
    return counts
  }, [allItems])

  const visibleItems = useMemo(
    () => (activeFilter === 'all' ? allItems : allItems.filter((i) => i.kind === activeFilter)),
    [activeFilter, allItems],
  )

  const unsyncedCount = useMemo(() => {
    if (!accountId) return 0
    const syncedKeys = new Set(cloudRows.map((r) => r.local_key || '').filter(Boolean))
    return genLocalWorks.filter((w) => !syncedKeys.has(w.id)).length
  }, [accountId, cloudRows, genLocalWorks])

  function handleFilterChange(next: WorkFilter) {
    setActiveFilter(next)
  }

  function handleOpen(item: WorkItem) {
    setActiveWork(item)
  }

  function handleCloseDetail() {
    setActiveWork(null)
  }

  function handleAskDelete(item: WorkItem) {
    if (item.source === 'cloud') {
      setPendingDelete(item)
      return
    }
    if (item.localId) {
      setGenLocalWorks(removeLocalWorkById(item.localId))
    }
    setActiveWork(null)
  }

  function handleCancelDelete() {
    setPendingDelete(null)
  }

  async function handleConfirmDelete() {
    const target = pendingDelete
    if (!target) return
    setPendingDelete(null)
    setActiveWork(null)
    if (target.cloudId) {
      try {
        const res = await fetch(`${getPocketBaseUrl()}/api/cloud_works/${target.cloudId}`, {
          method: 'DELETE',
          headers: { ...localAuthHeaders() },
        })
        if (!res.ok) throw new Error(`works cloud delete failed: ${res.status}`)
        setCloudRows((prev) => prev.filter((r) => r.id !== target.cloudId))
        setNoticeText(null)
      } catch {
        setNoticeText('雲端同步出了點問題')
      }
      return
    }
    if (target.localId) {
      setGenLocalWorks(removeLocalWorkById(target.localId))
    }
  }

  async function handleCopyText(text: string, key: string) {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const area = document.createElement('textarea')
      area.value = text
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      document.execCommand('copy')
      area.remove()
    }
    setCopiedKey(key)
    window.setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2000)
  }

  function downloadTextFile(text: string, fileName: string) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = fileName
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 4000)
  }

  async function handleDownload(item: WorkItem) {
    if (!item.mediaUrl) {
      const text =
        item.textContent ||
        (item.detailPayload ? detailToText(item.detailPayload) : '') ||
        (item.videoPayload ? videoSetToText(item.videoPayload) : '')
      if (text) downloadTextFile(text, `${item.summary || item.title || '作品'}.txt`)
      return
    }
    const url = item.mediaUrl
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`download failed: ${res.status}`)
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      const ext = item.assetType === 'video' ? 'mp4' : (url.split('.').pop() || 'png').split('?')[0].slice(0, 5)
      anchor.download = `${item.summary || item.title || '作品'}.${ext}`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 4000)
    } catch {
      window.open(url, '_blank', 'noopener')
    }
  }

  function handleContinue(item: WorkItem, target: ContinueTarget) {
    const path = target === 'scene' ? '/scene' : target === 'video' ? '/video' : '/tools'
    if (!item.mediaUrl) {
      navigate(path)
      return
    }
    navigate(`${path}?src=${encodeURIComponent(item.mediaUrl)}`)
  }

  function handleRetrySync() {
    if (!accountId) return
    void runCloudSync(accountId)
  }

  function handleGoLogin() {
    navigate('/login?from=/works')
  }

  function handleGoCreate() {
    navigate('/model-gen')
  }

  return {
    account,
    pageLoadState,
    syncPhase,
    noticeText,
    activeFilter,
    filterDefs: WORK_FILTER_DEFS,
    filterCounts,
    visibleItems,
    allCount: allItems.length,
    unsyncedCount,
    activeWork,
    pendingDelete,
    copiedKey,
    handleFilterChange,
    handleOpen,
    handleCloseDetail,
    handleAskDelete,
    handleCancelDelete,
    handleConfirmDelete,
    handleCopyText,
    handleDownload,
    handleContinue,
    handleRetrySync,
    handleGoLogin,
    handleGoCreate,
  }
}
