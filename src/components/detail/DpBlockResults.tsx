import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LayoutGrid, Loader2, Copy, Check, RefreshCw, RotateCcw, AlertCircle } from 'lucide-react'
import type { useDetail } from '@/pages/Detail/useDetail'

export function DpBlockResults(p: ReturnType<typeof useDetail>) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  function handleCopy(blockId: string) {
    p.handleCopyBlock(blockId)
    setCopiedId(blockId)
    setTimeout(() => setCopiedId(null), 1600)
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-md">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <LayoutGrid className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-lg font-bold">文案區塊</h2>
          <p className="text-xs text-muted-foreground">四個區塊獨立併發生成，部分失敗不影響成功結果</p>
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

      {p.errorMsg && p.detailSlots.length === 0 && (
        <div className="mb-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{p.errorMsg}</div>
      )}

      {p.detailSlots.length === 0 && (
        <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-background/50 text-center">
          <LayoutGrid className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            主圖標題、賣點模塊、規格參數、詳情描述四個區塊會展示在這裏
            <br />
            每個區塊通常只需幾秒到半分鐘
          </p>
        </div>
      )}

      {p.detailSlots.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {p.detailSlots.map(slot => (
            <article
              key={slot.blockId}
              className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-background shadow-sm"
            >
              <header className="flex min-h-10 items-center justify-between gap-2 px-3 py-2">
                <span className="text-sm font-bold text-foreground">{slot.label}</span>
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
                <div className="flex min-h-36 flex-1 flex-col items-center justify-center gap-3 bg-muted/40 px-4 py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground">正在寫「{slot.label}」…</p>
                </div>
              )}

              {slot.jobStatus === 'failed' && (
                <div className="flex min-h-36 flex-1 flex-col items-center justify-center gap-3 px-4 py-8 text-center">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                  <p className="text-xs text-destructive">{slot.errorText || '生成失敗'}</p>
                  <button
                    type="button"
                    onClick={() => p.handleRetryBlock(slot.blockId)}
                    className="flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    重試這個區塊
                  </button>
                </div>
              )}

              {slot.jobStatus === 'success' && slot.text && (
                <>
                  <div className="max-h-56 overflow-y-auto px-3 py-2">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{slot.text}</p>
                  </div>
                  <div className="mt-auto flex items-center gap-2 px-3 pb-3 pt-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(slot.blockId)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-md transition-transform hover:scale-105"
                    >
                      {copiedId === slot.blockId ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedId === slot.blockId ? '已複製' : '複製'}
                    </button>
                    <button
                      type="button"
                      onClick={() => p.handleRewriteBlock(slot.blockId)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      改寫再來一次
                    </button>
                  </div>
                  {slot.rewritten && (
                    <p className="px-3 pb-2 text-xs text-muted-foreground">已基於原結果改寫一版</p>
                  )}
                </>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
