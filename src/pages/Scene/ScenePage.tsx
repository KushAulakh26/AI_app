import { Loader2 } from 'lucide-react'
import type { useScene } from './useScene'
import { ScTopBar } from '@/components/scene/ScTopBar'
import { ScStepBar } from '@/components/scene/ScStepBar'
import { ScUploadPanel } from '@/components/scene/ScUploadPanel'
import { ScTemplatePanel } from '@/components/scene/ScTemplatePanel'
import { ScModelPicker } from '@/components/scene/ScModelPicker'
import { ScResultPanel } from '@/components/scene/ScResultPanel'
import { ScHistorySidebar } from '@/components/scene/ScHistorySidebar'
import { CostConfirmDialog } from '@/components/billing/CostConfirmDialog'

export function ScenePage(p: ReturnType<typeof useScene>) {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-background text-foreground">
      {/* 背景裝飾層 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/60 via-background to-background" />
        <div className="absolute -top-24 right-8 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute left-0 top-72 h-72 w-72 rounded-full bg-secondary blur-3xl" />
      </div>

      <ScTopBar />
      <CostConfirmDialog {...p} />

      <div className="relative mx-auto max-w-7xl px-4 pt-10 lg:px-8">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Scene Studio</p>
        <h1 className="mt-2 animate-in fade-in slide-in-from-bottom-4 duration-500 text-4xl font-bold leading-tight lg:text-5xl">
          商品場景圖<span className="text-primary">生成</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground lg:text-base">
          上傳商品圖自動摳出商品，勾選場景模板或寫一句自定義描述，一次併發放出多個場景的展示圖。
          生圖模型隨時切換，每張結果都會留在右側歷史裏，方便翻看對比。
        </p>
        <div className="mt-6">
          <ScStepBar stepIndex={p.stepIndex} />
        </div>
      </div>

      <main className="relative mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <ScUploadPanel {...p} />
            <ScTemplatePanel {...p} />
            <ScModelPicker {...p} />
          </div>
          <div className="space-y-6 lg:col-span-5">
            <ScResultPanel {...p} />
            <ScHistorySidebar {...p} />
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
          正在併發生成多個場景，可繼續配置下一組參數
        </div>
      )}
    </div>
  )
}
