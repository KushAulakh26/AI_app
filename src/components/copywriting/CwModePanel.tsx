import { LayoutGrid, Check } from 'lucide-react'
import { PLATFORM_STYLES } from '@/pages/Copywriting/useCopywriting'
import type { useCopywriting } from '@/pages/Copywriting/useCopywriting'

const FULL_SET_ITEMS = ['商品標題', '賣點清單', '營銷正文']

export function CwModePanel(p: ReturnType<typeof useCopywriting>) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-md">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <LayoutGrid className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-lg font-bold">生成方式</h2>
          <p className="text-xs text-muted-foreground">一鍵整套和平臺風格可以同時勾選，併發出稿</p>
        </div>
      </div>

      <button
        type="button"
        onClick={p.handleToggleFullSet}
        className={`mb-4 flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-left transition-all duration-200 ${
          p.fullSetOn
            ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/20'
            : 'border-border bg-background hover:border-primary/50'
        }`}
      >
        <span>
          <span className="block text-sm font-bold">一鍵整套文案</span>
          <span className="mt-1 block text-xs text-muted-foreground">{FULL_SET_ITEMS.join(' · ')}，一次出齊</span>
        </span>
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            p.fullSetOn ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background'
          }`}
        >
          {p.fullSetOn && <Check className="h-3.5 w-3.5" />}
        </span>
      </button>

      <p className="mb-2 text-xs font-medium text-muted-foreground">平臺風格 · 勾幾個就併發寫幾個渠道</p>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {PLATFORM_STYLES.map(style => {
          const active = p.selectedPlatformIds.includes(style.id)
          return (
            <button
              key={style.id}
              type="button"
              onClick={() => p.handleTogglePlatform(style.id)}
              className={`rounded-xl border px-4 py-3 text-left transition-all duration-200 ${
                active
                  ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/20'
                  : 'border-border bg-background hover:border-primary/50'
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold">{style.label}</span>
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background'
                  }`}
                >
                  {active && <Check className="h-3 w-3" />}
                </span>
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{style.desc}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
