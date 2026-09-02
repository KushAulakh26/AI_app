import { Loader2 } from 'lucide-react'
import type { useTools } from './useTools'
import { TlTopBar } from '@/components/tools/TlTopBar'
import { TlToolCards } from '@/components/tools/TlToolCards'
import { TlUploadPanel } from '@/components/tools/TlUploadPanel'
import { TlEnginePicker } from '@/components/tools/TlEnginePicker'
import { TlComparePanel } from '@/components/tools/TlComparePanel'
import { TlHistorySidebar } from '@/components/tools/TlHistorySidebar'
import { CostConfirmDialog } from '@/components/billing/CostConfirmDialog'

const STEP_LABELS = ['放上圖片', '確認處理', '對比繼續']

export function ToolsPage(p: ReturnType<typeof useTools>) {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-background text-foreground">
      {/* 背景裝飾層 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/60 via-background to-background" />
        <div className="absolute -top-24 right-8 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute left-0 top-72 h-72 w-72 rounded-full bg-secondary blur-3xl" />
      </div>

      <TlTopBar />
      <CostConfirmDialog {...p} />

      <div className="relative mx-auto max-w-7xl px-4 pt-10 lg:px-8">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Image Tool Kit</p>
        <h1 className="mt-2 animate-in fade-in slide-in-from-bottom-4 duration-500 text-4xl font-bold leading-tight lg:text-5xl">
          圖片工具<span className="text-primary">工作臺</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground lg:text-base">
          去背景出透明底、抹掉水印和標誌——選好工具放上圖就能處理，
          前後效果拖着滑塊對比。處理完還能接着做下一步，一條流水線搞定。
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {STEP_LABELS.map((label, idx) => (
            <span key={label} className="flex items-center gap-2">
              <span
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  idx === p.stepIndex
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : idx < p.stepIndex
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                <span className="font-mono">{idx + 1}</span>
                {label}
              </span>
              {idx < STEP_LABELS.length - 1 && <span className="h-px w-6 bg-border" />}
            </span>
          ))}
        </div>
      </div>

      <main className="relative mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <TlToolCards {...p} />
            <TlUploadPanel {...p} />
            <TlEnginePicker {...p} />
          </div>
          <div className="space-y-6 lg:col-span-5">
            <TlComparePanel {...p} />
            <TlHistorySidebar {...p} />
          </div>
        </div>
      </main>

      <footer className="relative border-t border-border/60 py-6">
        <p className="text-center text-xs text-muted-foreground">零壹電商寶 · 01X-AI Studio · 上傳商品圖，一站式生成電商內容</p>
      </footer>

      {p.toast && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background shadow-lg">
          {p.toast}
        </div>
      )}

      {p.isGenerating && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs text-muted-foreground shadow-lg">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          正在處理圖片，可以先看看歷史記錄
        </div>
      )}
    </div>
  )
}
