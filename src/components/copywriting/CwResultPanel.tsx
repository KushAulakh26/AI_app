import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  Bookmark,
  BookmarkCheck,
  RotateCcw,
  AlertCircle,
  X,
} from 'lucide-react'
import { llmModelMetaOf } from '@/pages/Copywriting/useCopywriting'
import type { useCopywriting } from '@/pages/Copywriting/useCopywriting'

export function CwResultPanel(p: ReturnType<typeof useCopywriting>) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  function handleCopy(slotId: string) {
    p.handleCopySlot(slotId)
    setCopiedId(slotId)
    setTimeout(() => setCopiedId(null), 1600)
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-md">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <FileText className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-lg font-bold">文案結果</h2>
          <p className="text-xs text-muted-foreground">每條文案獨立生成，部分失敗不影響成功結果</p>
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

      {p.errorMsg && p.copySlots.length === 0 && !p.restoredCopy && (
        <div className="mb-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{p.errorMsg}</div>
      )}

      {p.restoredCopy && p.copySlots.length === 0 && (
        <article className="mb-4 rounded-xl border border-border bg-background p-4 shadow-sm">
          <header className="mb-2 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-bold">
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {p.restoredCopy.label}
              </span>
              {p.restoredCopy.productName && (
                <span className="truncate text-xs font-normal text-muted-foreground">{p.restoredCopy.productName}</span>
              )}
            </span>
            <button
              type="button"
              onClick={p.handleClearRestored}
              className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="關閉回看"
            >
              <X className="h-4 w-4" />
            </button>
          </header>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{p.restoredCopy.text}</p>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{p.restoredCopy.timeLabel} 的歷史記錄</span>
            <button
              type="button"
              onClick={p.handleCopyRestored}
              className="flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Copy className="h-3.5 w-3.5" />
              複製這段
            </button>
          </div>
        </article>
      )}

      {p.copySlots.length === 0 && !p.restoredCopy && (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-background/50 text-center">
          <FileText className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            生成的文案會展示在這裏
            <br />
            每條通常只需幾秒到半分鐘
          </p>
        </div>
      )}

      {p.copySlots.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {p.copySlots.map(slot => {
            const saved = p.savedKeys.includes(slot.slotId)
            const meta = llmModelMetaOf(slot.modelName)
            return (
              <article
                key={slot.slotId}
                className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-background shadow-sm"
              >
                <header className="flex min-h-10 items-center justify-between gap-2 px-3 py-2">
                  <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <span className="truncate">{slot.label}</span>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs">{slot.category}</span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      slot.jobStatus === 'success'
                        ? 'bg-primary/10 text-primary'
                        : slot.jobStatus === 'failed'
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {slot.jobStatus === 'success' ? '完成' : slot.jobStatus === 'failed' ? '失敗' : '寫作中'}
                  </span>
                </header>

                {slot.jobStatus === 'running' && (
                  <div className="flex min-h-40 flex-1 flex-col items-center justify-center gap-3 bg-muted/40 px-4 py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground">正在寫「{slot.label}」…</p>
                  </div>
                )}

                {slot.jobStatus === 'failed' && (
                  <div className="flex min-h-40 flex-1 flex-col items-center justify-center gap-3 px-4 py-8 text-center">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                    <p className="text-xs text-destructive">{slot.errorText || '生成失敗'}</p>
                    <button
                      type="button"
                      onClick={() => p.handleRetrySlot(slot.slotId)}
                      className="flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      重試這條
                    </button>
                  </div>
                )}

                {slot.jobStatus === 'success' && slot.text && (
                  <>
                    <div className="max-h-64 overflow-y-auto px-3 py-2">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{slot.text}</p>
                    </div>
                    <div className="mt-auto space-y-2 px-3 pb-3 pt-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopy(slot.slotId)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-md transition-transform hover:scale-105"
                        >
                          {copiedId === slot.slotId ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          {copiedId === slot.slotId ? '已複製' : '複製'}
                        </button>
                        <button
                          type="button"
                          onClick={() => p.handleRewriteSlot(slot.slotId)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          改寫再來一次
                        </button>
                      </div>
                      <button
                        type="button"
                        disabled={saved}
                        onClick={() => p.handleSaveSlot(slot.slotId)}
                        className={`flex w-full items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-colors ${
                          saved
                            ? 'border-primary/40 bg-primary/10 text-primary'
                            : 'border-border bg-background text-foreground hover:border-primary hover:text-primary'
                        }`}
                      >
                        {saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                        {saved ? '已保存到我的作品' : '保存到我的作品'}
                      </button>
                      <p className="truncate text-xs text-muted-foreground">
                        {meta.displayName}
                        {slot.rewritten ? ' · 已改寫' : ''}
                      </p>
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
