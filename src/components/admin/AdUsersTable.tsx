import { Info } from "lucide-react"
import type { AdminUserRow } from "@/pages/Admin/useAdmin"
import { formatAdminDate } from "@/pages/Admin/useAdmin"

interface AdUsersTableProps {
  rows: AdminUserRow[]
  page: number
  totalPages: number
  loading: boolean
  onPage: (page: number) => void
}

// 使用者管理：全站註冊用戶列表。停用/刪除未開放（賬號體系的修改與刪除
// 僅限本人操作），此處如實以只讀列表呈現並說明。
export function AdUsersTable({ rows, page, totalPages, loading, onPage }: AdUsersTableProps) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-md">
      <div className="flex items-center gap-2 border-b border-border px-6 py-4">
        <Info className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <p className="text-xs leading-relaxed text-muted-foreground">
          此處可檢視全站註冊用戶。停用與刪除賬號涉及身份資料安全，僅開放用戶本人操作，管理端暫不提供代為停用或刪除。
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
              <th className="px-6 py-3 font-medium">郵箱</th>
              <th className="px-4 py-3 font-medium">名稱</th>
              <th className="px-4 py-3 font-medium">註冊時間</th>
              <th className="px-6 py-3 font-medium">狀態</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <tr key={idx} className="border-b border-border/60">
                  <td colSpan={4} className="px-6 py-4">
                    <div className="h-4 animate-pulse rounded-full bg-muted" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-sm text-muted-foreground">
                  目前還沒有註冊用戶
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-border/60 transition-colors last:border-b-0 hover:bg-muted/30">
                  <td className="px-6 py-3.5 font-medium">{row.email || "—"}</td>
                  <td className="px-4 py-3.5 text-muted-foreground">{row.name}</td>
                  <td className="px-4 py-3.5 text-muted-foreground">{formatAdminDate(row.created)}</td>
                  <td className="px-6 py-3.5">
                    {row.verified ? (
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                        已驗證
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        未驗證
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-border px-6 py-4">
        <p className="text-xs text-muted-foreground">
          第 {page} / {totalPages} 頁
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => onPage(page - 1)}
            className="rounded-full border border-border px-4 py-1.5 text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            上一頁
          </button>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => onPage(page + 1)}
            className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
          >
            下一頁
          </button>
        </div>
      </div>
    </div>
  )
}
