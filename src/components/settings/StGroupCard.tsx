import type { ReactNode } from 'react'
import type { SettingsEngine } from '@/pages/Settings/useSettings'

interface StGroupCardProps {
  icon: ReactNode
  title: string
  tagline: string
  engines: SettingsEngine[]
  defaultSlug: string
  isDisabled: (slug: string) => boolean
  onSetDefault: (slug: string) => void
  onToggle: (slug: string) => void
}

export function StGroupCard({
  icon,
  title,
  tagline,
  engines,
  defaultSlug,
  isDisabled,
  onSetDefault,
  onToggle,
}: StGroupCardProps) {
  return (
    <section className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-md">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </span>
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="text-xs text-muted-foreground">{tagline}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {engines.map(engine => {
          const isDefault = defaultSlug === engine.slug
          const off = isDisabled(engine.slug)
          return (
            <div
              key={engine.slug}
              className={`rounded-xl border p-3.5 transition-all duration-200 ${
                isDefault ? 'border-primary bg-primary/10 shadow-sm' : 'border-border bg-background'
              } ${off ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label={`把${engine.displayName}設爲默認引擎`}
                  onClick={() => onSetDefault(engine.slug)}
                  className={`h-5 w-5 shrink-0 rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    isDefault ? 'border-primary bg-primary' : 'border-border bg-background hover:border-primary/60'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold">{engine.displayName}</p>
                    {isDefault && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                        默認
                      </span>
                    )}
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                      {engine.priceHint}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{engine.useHint}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!off}
                  aria-label={`${off ? '啓用' : '停用'}${engine.displayName}`}
                  onClick={() => onToggle(engine.slug)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    off ? 'bg-muted' : 'bg-primary'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow-sm transition-all ${
                      off ? 'left-0.5' : 'left-[1.375rem]'
                    }`}
                  />
                </button>
              </div>
            </div>
          )
        })}
        {engines.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            這組暫時沒有可用引擎
          </p>
        )}
      </div>

      <p className="mt-auto pt-3 text-xs text-muted-foreground">標爲默認的引擎會排在各頁選擇清單最前，且始終保持啓用</p>
    </section>
  )
}
