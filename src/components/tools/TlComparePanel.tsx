import { Link } from 'react-router-dom'
import {
  Download,
  Bookmark,
  BookmarkCheck,
  RotateCcw,
  Loader2,
  ArrowLeftRight,
  ArrowRight,
  Route,
} from 'lucide-react'
import type { useTools } from '@/pages/Tools/useTools'

export function TlComparePanel(p: ReturnType<typeof useTools>) {
  const saved = !!p.lastWorkId && p.savedKeys.includes(p.lastWorkId)
  const showCompare = !!p.resultUrl && !!p.lastInputUrl
  const nextDef = p.activeDef.nextTool

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-md">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ArrowLeftRight className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-lg font-bold">處理前後對比</h2>
          <p className="text-xs text-muted-foreground">拖動中間滑塊，左邊原圖右邊效果</p>
        </div>
      </div>

      {p.needsLogin && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
          <p className="text-sm text-foreground">登錄後才能開始處理，先去登錄一下吧</p>
          <Link to="/login" className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground shadow-md">
            去登錄
          </Link>
        </div>
      )}

      {p.errorMsg && !p.resultUrl && (
        <div className="mb-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{p.errorMsg}</div>
      )}

      {p.isGenerating && (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-border bg-muted/40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">正在處理，約需 30–90 秒…</p>
        </div>
      )}

      {!p.isGenerating && !p.resultUrl && !p.errorMsg && (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-background/50 text-center">
          <ArrowLeftRight className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            處理完成後，這裏可以拖動滑塊對比前後效果
          </p>
        </div>
      )}

      {!p.isGenerating && p.resultUrl && (
        <>
          <div className="relative h-80 overflow-hidden rounded-xl border border-border bg-muted/40 shadow-sm md:h-96">
            <img src={p.resultUrl} alt="處理後效果" className="absolute inset-0 h-full w-full object-contain" />
            {showCompare && (
              <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - p.splitPos}% 0 0)` }}>
                <img src={p.lastInputUrl ?? ''} alt="處理前原圖" className="h-full w-full object-contain" />
              </div>
            )}
            {showCompare && (
              <span className="absolute left-3 top-3 rounded-full bg-background/90 px-3 py-1 text-xs font-semibold text-foreground shadow-sm">
                處理前
              </span>
            )}
            <span className="absolute right-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
              處理後
            </span>
            {showCompare && (
              <>
                <div
                  className="absolute inset-y-0 z-10 w-0.5 bg-card shadow-md"
                  style={{ left: `${p.splitPos}%` }}
                >
                  <span className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-primary shadow-md">
                    <ArrowLeftRight className="h-4 w-4" />
                  </span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={92}
                  value={p.splitPos}
                  onChange={e => p.setSplitPos(Number(e.target.value))}
                  aria-label="拖動查看處理前後對比"
                  className="absolute inset-0 z-20 h-full w-full cursor-ew-resize opacity-0"
                />
              </>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => p.handleDownload(p.resultUrl ?? '')}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-md transition-transform hover:scale-105"
            >
              <Download className="h-4 w-4" />
              下載
            </button>
            <button
              type="button"
              disabled={saved || !p.lastWorkId}
              onClick={() => p.handleSaveWork(p.lastWorkId)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors ${
                saved
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border bg-background text-foreground hover:border-primary hover:text-primary'
              }`}
            >
              {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              {saved ? '已保存' : '保存到我的作品'}
            </button>
            <button
              type="button"
              disabled={!p.canGenerate}
              onClick={p.handleGenerate}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-40"
            >
              <RotateCcw className="h-4 w-4" />
              重新處理
            </button>
          </div>

          <p className="mt-2 truncate text-xs text-muted-foreground">
            {p.resultTaskId ? `任務 ${p.resultTaskId.slice(0, 14)}…` : ''}
            {p.resultUsage?.thirdPartyConsumeMoney ? ` · 實付 ${p.resultUsage.thirdPartyConsumeMoney} 元` : ''}
          </p>

          <div className="mt-4 rounded-xl border border-border bg-secondary/50 p-4">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-bold">
              <Route className="h-4 w-4 text-primary" />
              流水線軌跡
            </p>
            {p.pipelineSteps.length === 0 ? (
              <p className="text-xs text-muted-foreground">處理完成後，這裏會記錄每一步，可把結果接着送進下一個工具</p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {p.pipelineSteps.map((step, idx) => (
                  <span key={`${step.step}-${step.url.slice(-16)}`} className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-medium shadow-sm ${
                        idx === p.pipelineSteps.length - 1
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background text-foreground'
                      }`}
                    >
                      第 {step.step} 步 · {step.toolLabel}
                    </span>
                    {idx < p.pipelineSteps.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
                  </span>
                ))}
              </div>
            )}

            {nextDef && p.resultUrl && (
              <button
                type="button"
                onClick={p.handleContinuePipeline}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                接着做下一步：{p.activeDef.nextHint}
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
            {!nextDef && p.pipelineSteps.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">這一步是流水線終點，想再處理別的圖可以重新開始</p>
                <button
                  type="button"
                  onClick={p.handleResetAll}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  重新開始
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}
