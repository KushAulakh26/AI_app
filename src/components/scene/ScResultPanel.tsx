import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Bookmark, BookmarkCheck, RotateCcw, Loader2, ImageIcon, Copy, Check, AlertCircle } from 'lucide-react'
import type { useScene } from '@/pages/Scene/useScene'

export function ScResultPanel(p: ReturnType<typeof useScene>) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const showRestored = p.genSlots.length === 0 && !!p.restoredResult?.url

  function copyTaskId(slotId: string, taskId: string) {
    navigator.clipboard?.writeText(taskId).then(() => {
      setCopiedId(slotId)
      setTimeout(() => setCopiedId(null), 1600)
    })
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-md">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ImageIcon className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-lg font-bold">生成結果</h2>
          <p className="text-xs text-muted-foreground">每個場景獨立出圖，部分失敗不影響成功結果</p>
        </div>
      </div>

      {p.needsLogin && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
          <p className="text-sm text-foreground">登錄後才能開始生成，先去登錄一下吧</p>
          <Link to="/login" className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground shadow-md">
            去登錄
          </Link>
        </div>
      )}

      {p.errorMsg && p.genSlots.length === 0 && (
        <div className="mb-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{p.errorMsg}</div>
      )}

      {showRestored && p.restoredResult && (
        <figure className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
          <img src={p.restoredResult.url} alt="最近生成結果" className="max-h-96 w-full object-contain" />
          <figcaption className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground">
            <span>已爲你恢復最近一次生成結果</span>
            {p.restoredResult.taskId && (
              <button type="button" onClick={() => copyTaskId('restored', p.restoredResult?.taskId ?? '')} className="flex items-center gap-1 hover:text-foreground">
                任務 {p.restoredResult.taskId.slice(0, 12)}…
                {copiedId === 'restored' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </button>
            )}
          </figcaption>
        </figure>
      )}

      {p.genSlots.length === 0 && !showRestored && (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-background/50 text-center">
          <ImageIcon className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            生成結果會展示在這裏
            <br />
            圖片通常需要 30–90 秒
          </p>
        </div>
      )}

      {p.genSlots.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {p.genSlots.map(slot => {
            const saved = p.savedKeys.includes(slot.slotId)
            return (
              <article key={slot.slotId} className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-background shadow-sm">
                <header className="flex min-h-10 items-center justify-between gap-2 px-3 py-2">
                  <span className="truncate text-xs font-medium text-muted-foreground">{slot.label}</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      slot.jobStatus === 'success'
                        ? 'bg-primary/10 text-primary'
                        : slot.jobStatus === 'failed'
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {slot.jobStatus === 'success' ? '完成' : slot.jobStatus === 'failed' ? '失敗' : '生成中'}
                  </span>
                </header>

                {slot.jobStatus === 'running' && (
                  <div className="flex h-64 flex-col items-center justify-center gap-3 bg-muted/40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground">正在生成，約需 30–90 秒…</p>
                  </div>
                )}

                {slot.jobStatus === 'success' && slot.url && (
                  <img src={slot.url} alt={slot.label} className="h-64 w-full object-cover" />
                )}

                {slot.jobStatus === 'failed' && (
                  <div className="flex h-64 flex-col items-center justify-center gap-3 px-4 text-center">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                    <p className="text-xs text-destructive">{slot.errorText || '生成失敗'}</p>
                    <button
                      type="button"
                      onClick={() => p.handleRetrySlot(slot.slotId)}
                      className="flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      重試這張
                    </button>
                  </div>
                )}

                {slot.jobStatus === 'success' && slot.url && (
                  <>
                    <div className="mt-auto flex items-center gap-2 px-3 pt-3">
                      <button
                        type="button"
                        onClick={() => p.handleDownload(slot.url ?? '')}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-md transition-transform hover:scale-105"
                      >
                        <Download className="h-3.5 w-3.5" />
                        下載
                      </button>
                      <button
                        type="button"
                        disabled={saved}
                        onClick={() => p.handleSaveWork(slot.slotId, slot.url ?? '')}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-colors ${
                          saved
                            ? 'border-primary/40 bg-primary/10 text-primary'
                            : 'border-border bg-background text-foreground hover:border-primary hover:text-primary'
                        }`}
                      >
                        {saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                        {saved ? '已保存' : '保存到我的作品'}
                      </button>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2">
                      <p className="truncate text-xs text-muted-foreground">
                        {slot.taskId ? `任務 ${slot.taskId.slice(0, 14)}…` : ''}
                        {slot.usage?.thirdPartyConsumeMoney ? ` · 實付 ${slot.usage.thirdPartyConsumeMoney} 元` : ''}
                      </p>
                      {slot.taskId && (
                        <button type="button" onClick={() => copyTaskId(slot.slotId, slot.taskId ?? '')} className="text-muted-foreground transition-colors hover:text-foreground">
                          {copiedId === slot.slotId ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
