import { Film, FileText, Trash2, Loader2 } from "lucide-react"
import type { AdminWorkRow } from "@/pages/Admin/useAdmin"
import { formatAdminDate, kindLabel } from "@/pages/Admin/useAdmin"

interface AdWorksGridProps {
  rows: AdminWorkRow[]
  page: number
  totalPages: number
  loading: boolean
  deletingId: string
  onPage: (page: number) => void
  onAskDelete: (row: AdminWorkRow) => void
}

function isTextKind(kind: string): boolean {
  return kind === "copy" || kind === "detail_set"
}

function isVideoKind(row: AdminWorkRow): boolean {
  return row.kind === "video" || row.asset_type === "video"
}

// 作品管理：全站用戶的作品牆，可刪除違規作品
export function AdWorksGrid({ rows, page, totalPages, loading, deletingId, onPage, onAskDelete }: AdWorksGridProps) {
  return (
    <div>
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="h-64 animate-pulse rounded-2xl border border-border bg-muted/60" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 px-6 py-16 text-center shadow-sm">
          <p className="text-sm font-medium">目前還沒有任何作品</p>
          <p className="mt-2 text-xs text-muted-foreground">用戶在各生成頁保存的作品會自動匯總到這裏</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((row) => {
            const cover = row.media_urls[0] ?? ""
            const busy = deletingId === row.id
            return (
              <article
                key={row.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-md transition-shadow hover:shadow-lg"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-muted">
                  {cover ? (
                    <img
                      src={cover}
                      alt={row.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center">
                      {isTextKind(row.kind) ? (
                        <FileText className="h-8 w-8 text-primary" aria-hidden />
                      ) : (
                        <Film className="h-8 w-8 text-primary" aria-hidden />
                      )}
                      {row.summary && (
                        <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{row.summary}</p>
                      )}
                    </div>
                  )}
                  {isVideoKind(row) && cover && (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-background/80 px-2 py-0.5 text-xs font-medium backdrop-blur">
                      <Film className="h-3 w-3" aria-hidden />
                      視頻
                    </span>
                  )}
                  <span className="absolute right-2 top-2 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground shadow-sm">
                    {kindLabel(row.kind)}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <h3 className="line-clamp-1 text-sm font-semibold" title={row.title}>
                    {row.title}
                  </h3>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {row.source_page ? `來源 ${row.source_page} · ` : ""}
                    {formatAdminDate(row.created)}
                  </p>
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <span className="text-xs text-muted-foreground">{row.user_id ? `用戶 ${row.user_id}` : "未關聯用戶"}</span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onAskDelete(row)}
                      className="inline-flex items-center gap-1 rounded-full border border-destructive/40 px-3 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Trash2 className="h-3.5 w-3.5" aria-hidden />}
                      刪除
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
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
