import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { getPocketBaseUrl } from "@/lib/pb"
import { localAuthHeaders, onLocalAccountChange, type LocalAccount } from "@/lib/localAuth"
import { loadAdminEmails } from "@/hooks/useIsAdmin"

export type AdminGate = "checking" | "guest" | "not-admin" | "admin"
export type AdminTab = "users" | "works"

export interface AdminUserRow {
  id: string
  email: string
  name: string
  created: string
  verified: boolean
  blocked: boolean
}

export interface AdminWorkRow {
  id: string
  user_id: string
  kind: string
  asset_type: string
  title: string
  summary: string
  media_urls: string[]
  source_page: string
  model_name: string
  created: string
}

const KIND_LABELS: Record<string, string> = {
  model: "模特圖",
  scene: "場景圖",
  copy: "營銷文案",
  detail_set: "詳情頁整套",
  video: "視頻",
  tool: "圖片工具",
}

export function kindLabel(kind: string): string {
  return KIND_LABELS[kind] ?? kind ?? "其他"
}

export function formatAdminDate(iso: string): string {
  if (!iso) return "—"
  return iso.slice(0, 10)
}

function parseMediaUrls(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((u): u is string => typeof u === "string" && !!u)
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.filter((u): u is string => typeof u === "string" && !!u) : []
    } catch {
      return []
    }
  }
  return []
}

interface PageResponse<T> {
  items?: T[]
  page?: number
  totalPages?: number
  totalItems?: number
}

const USERS_PER_PAGE = 10
const WORKS_PER_PAGE = 12

export function useAdmin() {
  const [gate, setGate] = useState<AdminGate>("checking")
  const [account, setAccount] = useState<LocalAccount | null>(null)
  const [activeTab, setActiveTab] = useState<AdminTab>("users")

  const [userRows, setUserRows] = useState<AdminUserRow[]>([])
  const [usersPage, setUsersPage] = useState(1)
  const [usersTotalPages, setUsersTotalPages] = useState(1)
  const [usersTotal, setUsersTotal] = useState(0)
  const [usersLoading, setUsersLoading] = useState(false)

  const [workRows, setWorkRows] = useState<AdminWorkRow[]>([])
  const [worksPage, setWorksPage] = useState(1)
  const [worksTotalPages, setWorksTotalPages] = useState(1)
  const [worksTotal, setWorksTotal] = useState(0)
  const [worksLoading, setWorksLoading] = useState(false)

  const [pendingDeleteWork, setPendingDeleteWork] = useState<AdminWorkRow | null>(null)
  const [deletingId, setDeletingId] = useState("")

  // 門禁：未登錄 → guest；登錄了但不在名單 → not-admin；名單內 → admin。
  // 登錄態變化（登出/換號）即時重新校驗。
  useEffect(() => {
    let alive = true
    const unsubscribe = onLocalAccountChange((current) => {
      setAccount(current)
      if (!current) {
        if (alive) setGate("guest")
        return
      }
      const email = current.email.trim().toLowerCase()
      loadAdminEmails().then((emails) => {
        if (!alive) return
        setGate(emails.includes(email) ? "admin" : "not-admin")
      })
    })
    return () => {
      alive = false
      unsubscribe()
    }
  }, [])

  const loadUsers = useCallback(async (page: number) => {
    setUsersLoading(true)
    try {
      const base = getPocketBaseUrl()
      const resp = await fetch(
        `${base}/api/collections/users/records?page=${page}&perPage=${USERS_PER_PAGE}&sort=-created`,
        { headers: { ...localAuthHeaders() } },
      )
      if (!resp.ok) throw new Error(`users ${resp.status}`)
      const data = (await resp.json()) as PageResponse<Record<string, unknown>>
      const rows: AdminUserRow[] = (data.items ?? []).map((item) => ({
        id: String(item.id ?? ""),
        email: typeof item.email === "string" ? item.email : "",
        name: typeof item.name === "string" && item.name ? item.name : "—",
        created: typeof item.created === "string" ? item.created : "",
        verified: item.verified === true,
        blocked: item.blocked === true,
      }))
      setUserRows(rows)
      setUsersPage(data.page ?? page)
      setUsersTotalPages(Math.max(1, data.totalPages ?? 1))
      setUsersTotal(data.totalItems ?? rows.length)
    } catch {
      toast.error("使用者列表載入失敗，請稍後再試")
    } finally {
      setUsersLoading(false)
    }
  }, [])

  const loadWorks = useCallback(async (page: number) => {
    setWorksLoading(true)
    try {
      const base = getPocketBaseUrl()
      const resp = await fetch(`${base}/api/cloud_works?page=${page}&perPage=${WORKS_PER_PAGE}&scope=all`, { headers: { ...localAuthHeaders() } })
      if (!resp.ok) throw new Error(`works ${resp.status}`)
      const data = (await resp.json()) as PageResponse<Record<string, unknown>>
      const rows: AdminWorkRow[] = (data.items ?? []).map((item) => ({
        id: String(item.id ?? ""),
        user_id: typeof item.user_id === "string" ? item.user_id : "",
        kind: typeof item.kind === "string" ? item.kind : "",
        asset_type: typeof item.asset_type === "string" ? item.asset_type : "",
        title: typeof item.title === "string" && item.title ? item.title : "未命名作品",
        summary: typeof item.summary === "string" ? item.summary : "",
        media_urls: parseMediaUrls(item.media_urls),
        source_page: typeof item.source_page === "string" ? item.source_page : "",
        model_name: typeof item.model_name === "string" ? item.model_name : "",
        created: typeof item.created === "string" ? item.created : "",
      }))
      setWorkRows(rows)
      setWorksPage(data.page ?? page)
      setWorksTotalPages(Math.max(1, data.totalPages ?? 1))
      setWorksTotal(data.totalItems ?? rows.length)
    } catch {
      toast.error("作品列表載入失敗，請稍後再試")
    } finally {
      setWorksLoading(false)
    }
  }, [])

  // 通過門禁後並行拉兩份數據（概覽計數也來自這裏）
  useEffect(() => {
    if (gate !== "admin") return
    void loadUsers(1)
    void loadWorks(1)
  }, [gate, loadUsers, loadWorks])

  const switchTab = useCallback((tab: AdminTab) => {
    setActiveTab(tab)
  }, [])

  const goUsersPage = useCallback(
    (page: number) => {
      void loadUsers(page)
    },
    [loadUsers],
  )

  const goWorksPage = useCallback(
    (page: number) => {
      void loadWorks(page)
    },
    [loadWorks],
  )

  const askDeleteWork = useCallback((row: AdminWorkRow) => {
    setPendingDeleteWork(row)
  }, [])

  const cancelDeleteWork = useCallback(() => {
    setPendingDeleteWork(null)
  }, [])

  const confirmDeleteWork = useCallback(async () => {
    if (!pendingDeleteWork) return
    const target = pendingDeleteWork
    setDeletingId(target.id)
    try {
      const resp = await fetch(`${getPocketBaseUrl()}/api/cloud_works/${target.id}`, {
        method: "DELETE",
        headers: { ...localAuthHeaders() },
      })
      if (!resp.ok) throw new Error(`delete ${resp.status}`)
      toast.success("已刪除該作品")
      setPendingDeleteWork(null)
      // 當前頁刪空了就退回上一頁
      if (workRows.length <= 1 && worksPage > 1) {
        void loadWorks(worksPage - 1)
      } else {
        void loadWorks(worksPage)
      }
    } catch {
      toast.error("刪除失敗，請稍後再試")
    } finally {
      setDeletingId("")
    }
  }, [pendingDeleteWork, workRows.length, worksPage, loadWorks])

  return {
    gate,
    account,
    activeTab,
    switchTab,
    usersTotal,
    worksTotal,
    userRows,
    usersPage,
    usersTotalPages,
    usersLoading,
    goUsersPage,
    workRows,
    worksPage,
    worksTotalPages,
    worksLoading,
    goWorksPage,
    pendingDeleteWork,
    deletingId,
    askDeleteWork,
    cancelDeleteWork,
    confirmDeleteWork,
  }
}
