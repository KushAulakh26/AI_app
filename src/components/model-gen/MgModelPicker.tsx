import { Cpu, Loader2, Zap } from 'lucide-react'
import { MODE_OPTIONS, modelMetaOf } from '@/pages/ModelGen/useModelGen'
import type { useModelGen } from '@/pages/ModelGen/useModelGen'

const PARAM_LABELS: Record<string, string> = {
  aspectRatio: '畫面比例',
  resolution: '分辨率',
  quality: '畫質',
  size: '尺寸',
  background: '背景',
}

export function MgModelPicker(p: ReturnType<typeof useModelGen>) {
  const currentMode = MODE_OPTIONS.find(m => m.id === p.modeId)

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-md">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Cpu className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-lg font-bold">選生圖模型</h2>
          <p className="text-xs text-muted-foreground">清單可配置，隨時切換，價格以所選模型爲準</p>
        </div>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {p.modelOptions.map(m => {
          const meta = modelMetaOf(m.model)
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

      {p.selectedInfo?.scalar_params && p.selectedInfo.scalar_params.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {p.selectedInfo.scalar_params.map(sp => (
            <div key={sp.name}>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">{PARAM_LABELS[sp.name] ?? sp.name}</p>
              <div className="flex flex-wrap gap-1.5">
                {(sp.enum ?? []).map(opt => {
                  const active = (p.paramValues[sp.name] ?? '') === opt
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => p.handleParamChange(sp.name, opt)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        active
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground'
                      }`}
                    >
                      {opt === 'empty' ? '自動' : opt}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 rounded-xl bg-secondary/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">
            {currentMode?.label ?? '生成'} · 本次出 <span className="font-bold text-primary">{p.taskCount}</span> 張
          </p>
          <p className="text-xs text-muted-foreground">
            {p.priceLoading ? '預估中' : p.priceText || '價格暫不可用'}
            {p.priceText ? ` / 張 × ${p.taskCount} 張` : ''}
          </p>
          {!p.cutoutUrl && p.cutoutJobStatus !== 'cutting' && (
            <p className="mt-1 text-xs text-muted-foreground">先完成上傳與摳服裝，即可開始生成</p>
          )}
        </div>
        <button
          type="button"
          disabled={!p.canGenerate}
          onClick={p.handleGenerate}
          className="flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-3 text-base font-bold text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl disabled:pointer-events-none disabled:opacity-40"
        >
          {p.isGenerating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              生成中…
            </>
          ) : (
            <>
              <Zap className="h-5 w-5" />
              開始生成{p.taskCount > 1 ? ` × ${p.taskCount}` : ''}
            </>
          )}
        </button>
      </div>
    </section>
  )
}
