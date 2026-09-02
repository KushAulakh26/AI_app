import { UtensilsCrossed, Leaf, Gift, Aperture, Coffee, Waves, PenLine, Check } from 'lucide-react'
import { SCENE_TEMPLATES } from '@/pages/Scene/useScene'
import type { useScene } from '@/pages/Scene/useScene'

const TEMPLATE_ICONS: Record<string, typeof Leaf> = {
  'table-still': UtensilsCrossed,
  'outdoor-grass': Leaf,
  festival: Gift,
  'studio-solid': Aperture,
  cafe: Coffee,
  seaside: Waves,
}

export function ScTemplatePanel(p: ReturnType<typeof useScene>) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-md">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Leaf className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-lg font-bold">選場景</h2>
            <p className="text-xs text-muted-foreground">模板可多選，也可寫一句自定義場景，選幾個就併發出幾張</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          已選 {p.taskCount} 個場景
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {SCENE_TEMPLATES.map(t => {
          const Icon = TEMPLATE_ICONS[t.id] ?? Leaf
          const active = p.selectedTemplateIds.includes(t.id)
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => p.handleToggleTemplate(t.id)}
              className={`relative flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left transition-all duration-200 ${
                active
                  ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/20'
                  : 'border-border bg-background hover:border-primary/50 hover:shadow-sm'
              }`}
            >
              {active && (
                <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary shadow-sm">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </span>
              )}
              <Icon className={`h-5 w-5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="text-sm font-bold">{t.label}</span>
              <span className="text-xs leading-relaxed text-muted-foreground">{t.desc}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-4 rounded-xl bg-secondary/50 p-4">
        <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium" htmlFor="sc-custom-scene">
          <PenLine className="h-4 w-4 text-primary" />
          自定義場景描述（可選）
        </label>
        <textarea
          id="sc-custom-scene"
          value={p.prompt}
          onChange={e => p.setPrompt(e.target.value)}
          rows={2}
          placeholder="例如：陽光下的木桌，旁邊有一杯咖啡…"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          填寫後會額外多出一張自定義場景圖，與所選模板一起併發生成
        </p>
      </div>
    </section>
  )
}
