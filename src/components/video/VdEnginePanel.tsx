import { Video, Loader2, Clapperboard } from 'lucide-react'
import { engineMetaOf, PARAM_LABELS, OPTION_LABELS } from '@/pages/Video/useVideo'
import type { useVideo } from '@/pages/Video/useVideo'

function optionLabel(paramName: string, opt: string): string {
  if (OPTION_LABELS[opt]) return OPTION_LABELS[opt]
  if (paramName === 'duration') return `${opt} 秒`
  return opt
}

export function VdEnginePanel(p: ReturnType<typeof useVideo>) {
  const selectedCount = p.selectedShotIds.length
  const missingFrames = selectedCount - p.readyShotCount

  return (
    <section className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-md">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Video className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-lg font-bold">生視頻引擎</h2>
          <p className="text-xs text-muted-foreground">清單可配置，隨時切換，按所選引擎計費</p>
        </div>
      </div>

      <div className="space-y-2">
        {p.engineOptions.map(m => {
          const meta = engineMetaOf(m.model)
          const active = p.selectedEngine === m.model
          return (
            <button
              key={m.model}
              type="button"
              onClick={() => p.handleSelectEngine(m.model)}
              className={`flex w-full items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-left transition-all duration-200 ${
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
        {p.engineOptions.length === 0 && (
          <p className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            正在加載引擎清單…
          </p>
        )}
      </div>

      {(p.selectedEngineInfo?.scalar_params ?? []).length > 0 && (
        <div className="mt-4 space-y-3 rounded-xl bg-secondary/50 p-4">
          <p className="text-xs font-bold text-foreground">視頻參數（按所選引擎契約）</p>
          {(p.selectedEngineInfo?.scalar_params ?? []).map(param => {
            const label = PARAM_LABELS[param.name] ?? param.name
            const value = p.engineParamValues[param.name] ?? ''
            if (param.enum && param.enum.length > 0) {
              return (
                <div key={param.name}>
                  <p className="mb-1.5 text-xs text-muted-foreground">{label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {param.enum.map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => p.handleEngineParamChange(param.name, opt)}
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                          value === opt
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
                        }`}
                      >
                        {optionLabel(param.name, opt)}
                      </button>
                    ))}
                  </div>
                </div>
              )
            }
            if (param.type === 'bool') {
              return (
                <div key={param.name} className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <div className="flex gap-1.5">
                    {(['true', 'false'] as const).map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => p.handleEngineParamChange(param.name, v)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          value === v
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
                        }`}
                      >
                        {v === 'true' ? '開' : '關'}
                      </button>
                    ))}
                  </div>
                </div>
              )
            }
            return (
              <div key={param.name}>
                <p className="mb-1.5 text-xs text-muted-foreground">{label}</p>
                <input
                  type={param.type === 'number' ? 'number' : 'text'}
                  value={value}
                  onChange={e => p.handleEngineParamChange(param.name, e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-auto pt-4">
        <div className="mb-3 flex items-center justify-between rounded-xl bg-secondary/60 px-4 py-3">
          <span className="text-xs text-muted-foreground">單鏡頭預估</span>
          <span className="text-sm font-bold text-primary">
            {p.priceLoading ? '預估中' : p.priceText || '價格暫不可用'}
          </span>
        </div>
        <button
          type="button"
          disabled={!p.canGenerateVideos}
          onClick={p.handleGenerateVideos}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-8 py-3 text-base font-bold text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-40"
        >
          {p.isVideoGenerating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              鏡頭生成中…
            </>
          ) : (
            <>
              <Clapperboard className="h-5 w-5" />
              生成視頻{selectedCount > 0 ? ` · ${selectedCount} 鏡` : ''}
            </>
          )}
        </button>
        {selectedCount === 0 && p.shots.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">先在旁邊勾選要生成視頻的關鍵鏡頭</p>
        )}
        {selectedCount > 0 && missingFrames > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">還有 {missingFrames} 個已勾選鏡頭沒選首幀畫面</p>
        )}
        {p.shots.length === 0 && (
          <p className="mt-2 text-xs text-muted-foreground">生成分鏡腳本後，就能挑鏡頭生成視頻</p>
        )}
      </div>
    </section>
  )
}
