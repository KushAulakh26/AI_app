import { useRef, useState } from 'react'
import { UserRound, ImagePlus, LayoutGrid, Shirt, Loader2, X, Plus, Wand2 } from 'lucide-react'
import { MODE_OPTIONS, MODEL_PERSONAS, SCENE_OPTIONS, OUTFIT_CATEGORIES } from '@/pages/ModelGen/useModelGen'
import type { useModelGen, ModeId } from '@/pages/ModelGen/useModelGen'

const MODE_ICONS: Record<ModeId, typeof UserRound> = {
  'swap-model': UserRound,
  'custom-model': ImagePlus,
  'auto-4': LayoutGrid,
  'full-outfit': Shirt,
}

export function MgModePanel(p: ReturnType<typeof useModelGen>) {
  const [outfitCategory, setOutfitCategory] = useState<string>(OUTFIT_CATEGORIES[0])
  const modelImgRef = useRef<HTMLInputElement>(null)
  const outfitImgRef = useRef<HTMLInputElement>(null)

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-md">
      <div className="mb-4">
        <h2 className="text-lg font-bold">選玩法</h2>
        <p className="text-xs text-muted-foreground">四種玩法任選，參數隨時可換</p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {MODE_OPTIONS.map(mode => {
          const Icon = MODE_ICONS[mode.id]
          const active = p.modeId === mode.id
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => p.handleModeChange(mode.id)}
              className={`flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all duration-200 ${
                active
                  ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/20'
                  : 'border-border bg-background hover:border-primary/50 hover:shadow-sm'
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="text-sm font-bold">{mode.label}</span>
              <span className="text-xs text-muted-foreground">{mode.desc}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-5 rounded-xl bg-secondary/50 p-4">
        {p.modeId === 'swap-model' && (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium">選模特卡片</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {MODEL_PERSONAS.map(persona => {
                  const active = p.personaId === persona.id
                  return (
                    <button
                      key={persona.id}
                      type="button"
                      onClick={() => p.setPersonaId(persona.id)}
                      className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                        active
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background text-foreground hover:border-primary/50'
                      }`}
                    >
                      <span className="block text-sm font-medium">{persona.label}</span>
                      <span className="block text-xs text-muted-foreground">{persona.desc}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">選拍攝場景</p>
              <div className="flex flex-wrap gap-2">
                {SCENE_OPTIONS.map(scene => {
                  const active = p.sceneId === scene.id
                  return (
                    <button
                      key={scene.id}
                      type="button"
                      title={scene.desc}
                      onClick={() => p.setSceneId(scene.id)}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                        active
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'bg-background text-muted-foreground border border-border hover:text-foreground'
                      }`}
                    >
                      {scene.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {p.modeId === 'custom-model' && (
          <div>
            <p className="mb-2 text-sm font-medium">上傳指定模特圖（臉部或全身均可）</p>
            <button
              type="button"
              onClick={() => modelImgRef.current?.click()}
              className="relative flex min-h-32 w-full flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-background/70 p-3 transition-colors hover:border-primary"
            >
              {p.modelImagePreview ? (
                <img src={p.modelImagePreview} alt="模特圖預覽" className="max-h-44 rounded-lg object-contain" />
              ) : (
                <span className="flex flex-col items-center gap-2 text-muted-foreground">
                  <ImagePlus className="h-8 w-8 text-primary" />
                  <span className="text-sm">點擊上傳模特圖，把商品穿到 TA 身上</span>
                </span>
              )}
              {p.modelImageStatus === 'uploading' && (
                <span className="absolute inset-0 flex items-center justify-center bg-background/70">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </span>
              )}
            </button>
            {p.modelImageStatus === 'error' && <p className="mt-2 text-xs text-destructive">模特圖上傳失敗，請重試</p>}
            <input
              ref={modelImgRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={e => {
                p.handleModelImageChange(e.target.files?.[0] ?? null)
                e.target.value = ''
              }}
            />
          </div>
        )}

        {p.modeId === 'auto-4' && (
          <div className="flex items-start gap-3">
            <Wand2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="text-sm text-muted-foreground">
              不用挑模特和場景，自動搭配 4 種不同風格（雜誌棚拍 / 街頭隨拍 / 咖啡生活 / 戶外自然）併發出圖，挑最滿意的一張。
            </p>
          </div>
        )}

        {p.modeId === 'full-outfit' && (
          <div className="space-y-3">
            <p className="text-sm font-medium">添加多件單品，同一模特一次穿全套（併發出 2 套場景）</p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={outfitCategory}
                onChange={e => setOutfitCategory(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {OUTFIT_CATEGORIES.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => outfitImgRef.current?.click()}
                className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-md transition-transform hover:scale-105"
              >
                <Plus className="h-4 w-4" />
                添加{outfitCategory}圖片
              </button>
            </div>
            {p.outfitItems.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {p.outfitItems.map(item => (
                  <div key={item.itemId} className="relative">
                    <img
                      src={item.preview ?? ''}
                      alt={item.category}
                      className="h-20 w-20 rounded-lg border border-border object-cover"
                    />
                    <span className="absolute inset-x-0 bottom-0 rounded-b-lg bg-background/80 py-0.5 text-center text-xs text-muted-foreground">
                      {item.category}
                    </span>
                    {item.status === 'uploading' && (
                      <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/60">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => p.handleRemoveOutfitItem(item.itemId)}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">主商品圖作爲核心單品，其餘單品自動組合成整套穿搭</p>
            <input
              ref={outfitImgRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={e => {
                p.handleAddOutfitItem(e.target.files?.[0] ?? null, outfitCategory)
                e.target.value = ''
              }}
            />
          </div>
        )}

        <div className="mt-4 border-t border-border/60 pt-4">
          <label className="mb-1.5 block text-sm font-medium" htmlFor="mg-extra-prompt">
            補充要求（可選）
          </label>
          <textarea
            id="mg-extra-prompt"
            value={p.prompt}
            onChange={e => p.setPrompt(e.target.value)}
            rows={2}
            placeholder="例如：模特微笑、逆光氛圍、強調面料質感…"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
      </div>
    </section>
  )
}
