import { Loader2 } from 'lucide-react'
import type { useDetail } from './useDetail'
import { DpTopBar } from '@/components/detail/DpTopBar'
import { DpBriefPanel } from '@/components/detail/DpBriefPanel'
import { DpModelPicker } from '@/components/detail/DpModelPicker'
import { DpBlockResults } from '@/components/detail/DpBlockResults'
import { DpImagePanel } from '@/components/detail/DpImagePanel'
import { DpPreviewPanel } from '@/components/detail/DpPreviewPanel'
import { DpHistorySidebar } from '@/components/detail/DpHistorySidebar'
import { CostConfirmDialog } from '@/components/billing/CostConfirmDialog'

export function DetailPage(p: ReturnType<typeof useDetail>) {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-background text-foreground">
      {/* 背景裝飾層 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/60 via-background to-background" />
        <div className="absolute -top-24 right-8 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute left-0 top-72 h-72 w-72 rounded-full bg-secondary blur-3xl" />
      </div>

      <DpTopBar />
      <CostConfirmDialog {...p} />

      <div className="relative mx-auto max-w-7xl px-4 pt-10 lg:px-8">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Detail Builder</p>
        <h1 className="mt-2 animate-in fade-in slide-in-from-bottom-4 duration-500 text-4xl font-bold leading-tight lg:text-5xl">
          商品詳情頁<span className="text-primary">排版</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground lg:text-base">
          填好商品信息，一次出齊主圖標題、賣點模塊、規格參數、詳情描述四個版塊，再把模特圖、場景圖或自己上傳的圖拉進來，
          按手機端詳情頁的順序拼成圖文長頁，整套可保存、整篇文案可導出。
        </p>
      </div>

      <main className="relative mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-4">
            <DpBriefPanel {...p} />
            <DpModelPicker {...p} />
          </div>
          <div className="space-y-6 lg:col-span-8">
            <DpBlockResults {...p} />
            <div className="grid gap-6 xl:grid-cols-5">
              <div className="xl:col-span-3">
                <DpImagePanel {...p} />
              </div>
              <div className="xl:col-span-2">
                <DpPreviewPanel {...p} />
              </div>
            </div>
            <DpHistorySidebar {...p} />
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
          正在併發生成 4 個文案區塊，可先去挑圖排版
        </div>
      )}
    </div>
  )
}
