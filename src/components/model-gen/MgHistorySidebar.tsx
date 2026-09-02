import { History, Trash2, BookmarkCheck } from 'lucide-react'
import type { useModelGen, SidebarWork } from '@/pages/ModelGen/useModelGen'

export function MgHistorySidebar(p: ReturnType<typeof useModelGen>) {
  function handleWorkClick(w: SidebarWork) {
    if (w.source === 'platform' && w.jobId) {
      const item = p.genHistory.find(h => h.jobId === w.jobId)
      if (item) {
        p.handleRestoreHistory(item)
        return
      }
    }
    p.handleShowWork(w.url)
  }

  return (
    <aside className="flex flex-col rounded-2xl border border-border bg-card shadow-md">
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <History className="h-4 w-4" />
          </span>
          <h2 className="text-lg font-bold">生成歷史</h2>
        </div>
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
          {p.sidebarWorks.length}
        </span>
      </header>

      <div className="max-h-96 space-y-2 overflow-y-auto p-4">
        {p.sidebarWorks.length === 0 && (
          <p className="py-10 text-center text-sm leading-relaxed text-muted-foreground">
            還沒有歷史記錄
            <br />
            生成過的作品會自動留在這裏，隨時翻看對比
          </p>
        )}
        {p.sidebarWorks.map(w => (
          <div
            key={w.key}
            className="group flex items-center gap-2 rounded-xl border border-border bg-background p-2 transition-colors hover:border-primary/60"
          >
            <button type="button" onClick={() => handleWorkClick(w)} className="flex flex-1 items-center gap-3 text-left">
              <img src={w.url} alt={w.modeLabel} className="h-14 w-14 shrink-0 rounded-lg border border-border object-cover" />
              <span className="min-w-0">
                <span className="flex items-center gap-1 text-xs font-medium text-foreground">
                  <span className="truncate">{w.modeLabel}</span>
                  {w.saved && <BookmarkCheck className="h-3 w-3 shrink-0 text-primary" />}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{w.timeLabel}</span>
              </span>
            </button>
            {w.source === 'local' && (
              <button
                type="button"
                onClick={() => p.handleRemoveLocalWork(w.key)}
                className="rounded-full p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                title="刪除這條記錄"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </aside>
  )
}
