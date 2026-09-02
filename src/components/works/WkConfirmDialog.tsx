import { Trash2 } from 'lucide-react'
import type { WorkItem } from '@/pages/Works/useWorks'

interface WkConfirmDialogProps {
  item: WorkItem | null
  onCancel: () => void
  onConfirm: () => void
}

export function WkConfirmDialog({ item, onCancel, onConfirm }: WkConfirmDialogProps) {
  if (!item) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm animate-in fade-in zoom-in-95 duration-300 rounded-2xl border border-border bg-card p-6 shadow-lg">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <Trash2 className="h-5 w-5 text-destructive" />
        </span>
        <p className="mt-4 text-base font-bold">刪除這件作品？</p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          「{item.title}」會從雲端作品裏刪掉，刪了就找不回來了。
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            先不刪
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground shadow-md transition-all hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            確認刪除
          </button>
        </div>
      </div>
    </div>
  )
}
