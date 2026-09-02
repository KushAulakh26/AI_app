import { useEffect, useState } from "react"
import { getPocketBaseUrl } from "@/lib/pb"
import { onLocalAccountChange } from "@/lib/localAuth"

// 管理員名單（唯讀表，只開 list 路由）。模塊級緩存，全站導航入口與
// /admin 門禁共用同一份比對結果；登錄態變化時重新比對，不重複拉取。
let whitelistCache: string[] | null = null
let whitelistPromise: Promise<string[]> | null = null

export function loadAdminEmails(): Promise<string[]> {
  if (whitelistCache) return Promise.resolve(whitelistCache)
  if (!whitelistPromise) {
    whitelistPromise = fetch(`${getPocketBaseUrl()}/api/admin_whitelist`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data: { items?: Array<{ email?: unknown }> }) => {
        const items = Array.isArray(data?.items) ? data.items : []
        const emails = items
          .map((item) => String(item?.email ?? "").trim().toLowerCase())
          .filter(Boolean)
        whitelistCache = emails
        return emails
      })
      .catch(() => [])
  }
  return whitelistPromise
}

// 當前登錄賬號是否在管理員名單內。導航入口用它決定顯隱；
// /admin 頁面用它做二次校驗。
export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminChecked, setAdminChecked] = useState(false)

  useEffect(() => {
    let alive = true
    const unsubscribe = onLocalAccountChange((account) => {
      const email = (account?.email ?? "").trim().toLowerCase()
      if (!email) {
        if (alive) {
          setIsAdmin(false)
          setAdminChecked(true)
        }
        return
      }
      loadAdminEmails().then((emails) => {
        if (!alive) return
        setIsAdmin(emails.includes(email))
        setAdminChecked(true)
      })
    })
    return () => {
      alive = false
      unsubscribe()
    }
  }, [])

  return { isAdmin, adminChecked }
}
