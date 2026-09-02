import type { MouseEvent } from 'react'
import { History, Trash2, BookmarkCheck } from 'lucide-react'
import type { useDetail } from '@/pages/Detail/useDetail'

export function DpHistorySidebar(p: ReturnType<typeof useDetail>) {
  function handleItemRemove(e: MouseEvent<HTMLButtonElement>, key: string) {
    e.stopPropagation()
    p.handleRemoveHistory(key)
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
          {p.detailHistory.length}
        </span>
      </header>

      <div className="max-h-96 space-y-2 overflow-y-auto p-4">
        {p.detailHistory.length === 0 && (
          <p className="py-10 text-center text-sm leading-relaxed text-muted-foreground">
            還沒有歷史記錄
            <br />
            每次生成的詳情頁會自動留在這裏，隨時點開回看
          </p>
        )}
        {p.detailHistory.map(item => (
          <div
            key={item.key}
            role="button"
            tabIndex={0}
            onClick={() => p.handleShowHistory(item)}
            onKeyDown={e => {
              if (e.key === 'Enter') p.handleShowHistory(item)
            }}
            className="group cursor-pointer rounded-xl border border-border bg-background p-3 transition-colors hover:border-primary/60"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  詳情頁 · {item.blockTexts.length} 區塊
                </span>
                {item.saved && <BookmarkCheck className="h-3 w-3 shrink-0 text-primary" />}
                {item.imageUrls.length > 0 && (
                  <span className="shrink-0 text-xs text-muted-foreground">{item.imageUrls.length} 圖</span>
                )}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">{item.timeLabel}</span>
            </div>
            {item.productName && (
              <p className="mt-1.5 truncate text-xs font-medium text-foreground">{item.productName}</p>
            )}
            {item.blockTexts[0] && (
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.blockTexts[0].text}</p>
            )}
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{item.modelName}</span>
              <button
                type="button"
                onClick={e => handleItemRemove(e, item.key)}
                className="rounded-full p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-destructive group-hover:opacity-100"
                title="刪除這條記錄"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}
