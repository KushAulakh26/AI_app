import { Cpu, Loader2, Zap } from 'lucide-react'
import type { useTools } from '@/pages/Tools/useTools'
import { modelMetaOf } from '@/pages/Tools/useTools'
import type { AigcScalarParam } from '@/lib/aigc'

const PARAM_LABELS: Record<string, string> = {
  aspectRatio: '畫面比例',
  resolution: '分辨率',
  quality: '畫質',
  size: '尺寸',
  background: '背景',
  scale: '放大倍數',
  subjectDetection: '主體檢測',
  faceEnhancement: '人臉增強',
  faceEnhancementCreativity: '人臉增強創意度',
  faceEnhancementStrength: '人臉增強強度',
  outputWidth: '輸出寬度',
  outputHeight: '輸出高度',
  cropToFill: '裁剪填滿',
  outputFormat: '輸出格式',
}

function isUnitRange(sp: AigcScalarParam): boolean {
  return typeof sp.default === 'number' && sp.default >= 0 && sp.default <= 1
}

export function TlEnginePicker(p: ReturnType<typeof useTools>) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-md">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Cpu className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-lg font-bold">選處理引擎</h2>
          <p className="text-xs text-muted-foreground">僅顯示可接收圖片與提示詞的引擎；價格以實際服務商爲準</p>
        </div>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {p.toolModels.map(m => {
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
        {p.toolModels.length === 0 && p.activeDef.category === 'upscale' && (
          <div className="col-span-full rounded-xl border border-dashed border-border bg-secondary/40 px-4 py-4 text-sm">
            <p className="font-medium text-foreground">引擎不可用</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">當前服務商暫未提供「高清修復」引擎，暫時無法處理。請改用去背景或去水印，或稍後再試。</p>
          </div>
        )}
        {p.toolModels.length === 0 && p.activeDef.category !== 'upscale' && (
          <p className="col-span-full flex items-center gap-2 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            正在加載引擎清單…
          </p>
        )}
      </div>

      {p.activeDef.category === 'edit' && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">補充要求（選填）</p>
          <textarea
            value={p.extraPrompt}
            onChange={e => p.setExtraPrompt(e.target.value)}
            placeholder={p.activeTool === 'remove-bg' ? '例如：邊緣再幹淨一點，保留商品投影' : '例如：只去掉右上角的價格標籤'}
            className="min-h-16 w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
      )}

      {p.selectedInfo?.scalar_params && p.selectedInfo.scalar_params.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {p.selectedInfo.scalar_params.map(sp => {
            const label = PARAM_LABELS[sp.name] ?? sp.name
            const current = p.paramValues[sp.name] ?? ''
            return (
              <div key={sp.name}>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
                {sp.enum && sp.enum.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {sp.enum.map(opt => {
                      const active = current === opt
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
                )}
                {sp.type === 'bool' && !sp.enum && (
                  <div className="flex gap-1.5">
                    {[
                      { val: 'true', text: '開啓' },
                      { val: 'false', text: '關閉' },
                    ].map(opt => {
                      const active = current === opt.val
                      return (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => p.handleParamChange(sp.name, opt.val)}
                          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                            active
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground'
                          }`}
                        >
                          {opt.text}
                        </button>
                      )
                    })}
                  </div>
                )}
                {sp.type === 'number' && !sp.enum && isUnitRange(sp) && (
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={current === '' ? 0 : Number(current)}
                      onChange={e => p.handleParamChange(sp.name, e.target.value)}
                      className="h-2 w-full cursor-pointer accent-primary"
                    />
                    <span className="w-10 text-right font-mono text-xs text-muted-foreground">{current || '0'}</span>
                  </div>
                )}
                {sp.type === 'number' && !sp.enum && !isUnitRange(sp) && (
                  <input
                    type="number"
                    value={current}
                    onChange={e => p.handleParamChange(sp.name, e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 rounded-xl bg-secondary/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">
            {p.activeDef.label} · 本次處理 <span className="font-bold text-primary">1</span> 張
          </p>
          <p className="text-xs text-muted-foreground">
            {p.priceLoading ? '預估中' : p.priceText || '價格暫不可用'}
          </p>
          {!p.imageUrlsUrl && p.imageUrlsStatus !== 'uploading' && (
            <p className="mt-1 text-xs text-muted-foreground">先上傳或選一張圖，再開始處理</p>
          )}
        </div>
        <button
          type="button"
          disabled={!p.canGenerate}
          onClick={p.handleGenerate}
          className="flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-3 text-base font-bold text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:shadow-[var(--focus-ring)] disabled:pointer-events-none disabled:opacity-40"
        >
          {p.isGenerating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              處理中…
            </>
          ) : (
            <>
              <Zap className="h-5 w-5" />
              開始處理
            </>
          )}
        </button>
      </div>
    </section>
  )
}
