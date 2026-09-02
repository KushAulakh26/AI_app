import { Loader2 } from 'lucide-react'
import type { useVideo } from './useVideo'
import { VdTopBar } from '@/components/video/VdTopBar'
import { VdBriefPanel } from '@/components/video/VdBriefPanel'
import { VdLlmPicker } from '@/components/video/VdLlmPicker'
import { VdScriptPanel } from '@/components/video/VdScriptPanel'
import { VdEnginePanel } from '@/components/video/VdEnginePanel'
import { VdShotVideoPanel } from '@/components/video/VdShotVideoPanel'
import { VdHistorySidebar } from '@/components/video/VdHistorySidebar'
import { CostConfirmDialog } from '@/components/billing/CostConfirmDialog'

export function VideoPage(p: ReturnType<typeof useVideo>) {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-background text-foreground">
      {/* 背景裝飾層 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/60 via-background to-background" />
        <div className="absolute -top-24 right-8 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute left-0 top-72 h-72 w-72 rounded-full bg-secondary blur-3xl" />
      </div>

      <VdTopBar />
      <CostConfirmDialog {...p} />

      <div className="relative mx-auto max-w-7xl px-4 pt-10 lg:px-8">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Video Script Studio</p>
        <h1 className="mt-2 animate-in fade-in slide-in-from-bottom-4 duration-500 text-4xl font-bold leading-tight lg:text-5xl">
          商品短視頻<span className="text-primary">分鏡</span>工作臺
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground lg:text-base">
          填好商品信息、選視頻類型，先寫出完整分鏡腳本——每鏡畫面、臺詞字幕、時長、配樂建議都能逐鏡改寫；
          再勾選關鍵鏡頭、配上首幀畫面，逐鏡併發生成短視頻片段，整套腳本帶視頻自動存檔。
        </p>
      </div>

      <main className="relative mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-4">
            <VdBriefPanel {...p} />
            <VdLlmPicker {...p} />
          </div>
          <div className="space-y-6 lg:col-span-8">
            <VdScriptPanel {...p} />
            {p.hasShotStudio && (
              <div className="grid gap-6 xl:grid-cols-5">
                <div className="xl:col-span-2">
                  <VdEnginePanel {...p} />
                </div>
                <div className="xl:col-span-3">
                  <VdShotVideoPanel {...p} />
                </div>
              </div>
            )}
            <VdHistorySidebar {...p} />
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

      {p.isVideoGenerating && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs text-muted-foreground shadow-lg">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          正在併發生成鏡頭視頻，通常要幾分鐘，可先看別的
        </div>
      )}
    </div>
  )
}
