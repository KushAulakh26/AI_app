import { Trash2, Loader2 } from "lucide-react"
import type { AdminWorkRow } from "@/pages/Admin/useAdmin"

interface AdConfirmDialogProps {
  work: AdminWorkRow | null
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}

// 刪除作品的二次确认弹窗
export function AdConfirmDialog({ work, busy, onCancel, onConfirm }: AdConfirmDialogProps) {
  if (!work) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 px-4 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-lg animate-in fade-in zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <Trash2 className="h-6 w-6 text-destructive" aria-hidden />
        </span>
        <h2 className="mt-5 text-lg font-bold">確定刪除這件作品？</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          「{work.title}」刪除後無法恢復，所有用戶都將看不到它。
        </p>
        <div className="mt-7 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-full border border-border px-5 py-2 text-sm transition-colors hover:bg-muted disabled:opacity-50"
          >
            先不刪
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 rounded-full bg-destructive px-5 py-2 text-sm font-semibold text-destructive-foreground shadow-md transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            確認刪除
          </button>
        </div>
      </div>
    </div>
  )
}
