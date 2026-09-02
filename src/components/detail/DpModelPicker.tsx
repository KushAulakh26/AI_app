import { Cpu, Loader2, Zap } from 'lucide-react'
import { llmModelMetaOf } from '@/pages/Detail/useDetail'
import type { useDetail } from '@/pages/Detail/useDetail'

export function DpModelPicker(p: ReturnType<typeof useDetail>) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-md">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Cpu className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-lg font-bold">選寫作模型</h2>
          <p className="text-xs text-muted-foreground">清單可配置，隨時切換，費用按所選模型的 token 計</p>
        </div>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {p.modelOptions.map(m => {
          const meta = llmModelMetaOf(m.model)
          const active = p.selectedModel === m.model
          return (
            <button
              key={m.model}
              type="button"
              onClick={() => p.handleSelectModel(m.model)}
              className={`flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left transition-all duration-200 ${
                active
                  ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/20'
                  : 'border-border bg-background hover:border-primary/50'
              }`}
            >
              <span>
                <span className="block text-sm font-bold">{meta.displayName}</span>
                <span className="block text-xs text-muted-foreground">{meta.priceHint}</span>
              </span>
              <span
                className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                  active ? 'border-primary bg-primary' : 'border-border bg-background'
                }`}
              />
            </button>
          )
        })}
        {p.modelOptions.length === 0 && (
          <p className="col-span-full flex items-center gap-2 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            正在加載模型清單…
          </p>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-xl bg-secondary/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">
            詳情頁文案 · 一次出 <span className="font-bold text-primary">4</span> 個區塊
          </p>
          <p className="text-xs text-muted-foreground">主圖標題 / 賣點模塊 / 規格參數 / 詳情描述，併發生成</p>
        </div>
        <button
          type="button"
          disabled={!p.canGenerate}
          onClick={p.handleGenerate}
          className="flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-3 text-base font-bold text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-40"
        >
          {p.isGenerating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              寫作中…
            </>
          ) : (
            <>
              <Zap className="h-5 w-5" />
              生成詳情頁文案
            </>
          )}
        </button>
      </div>

      {(!p.productName.trim() || !p.sellingPoints.trim()) && (
        <p className="mt-2 text-xs text-muted-foreground">商品名稱和核心賣點填好之後就能開始生成</p>
      )}
    </section>
  )
}
