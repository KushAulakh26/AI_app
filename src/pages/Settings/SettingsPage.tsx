import type { ReactNode } from 'react'
import { ImagePlus, Clapperboard, ZoomIn, PenLine, Loader2 } from 'lucide-react'
import type { PrefGroup } from '@/lib/modelPrefs'
import type { useSettings } from './useSettings'
import { StTopBar } from '@/components/settings/StTopBar'
import { StSyncBanner } from '@/components/settings/StSyncBanner'
import { StGroupCard } from '@/components/settings/StGroupCard'
import { StBillingNote } from '@/components/settings/StBillingNote'

const GROUP_ICONS: Record<PrefGroup, ReactNode> = {
  'image-edit': <ImagePlus className="h-5 w-5" aria-hidden />,
  'video-gen': <Clapperboard className="h-5 w-5" aria-hidden />,
  upscale: <ZoomIn className="h-5 w-5" aria-hidden />,
  writing: <PenLine className="h-5 w-5" aria-hidden />,
}

export function SettingsPage(p: ReturnType<typeof useSettings>) {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-background font-sans text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_8%,hsl(var(--primary)/0.14),transparent_36%)]"
      />
      <div aria-hidden className="pointer-events-none absolute -left-24 top-64 h-72 w-72 rounded-full bg-secondary blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-20 top-[36rem] h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative">
        <StTopBar />

        <main className="mx-auto max-w-6xl px-4 pb-16 lg:px-8">
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 py-10">
            <div className="rounded-3xl bg-gradient-to-br from-background via-secondary to-card p-8 shadow-lg">
              <p className="font-mono text-xs uppercase tracking-widest text-primary">Engine Settings</p>
              <h1 className="mt-3 text-4xl font-bold md:text-5xl">引擎你來定，全站都聽你的</h1>
              <p className="mt-3 max-w-xl text-sm text-muted-foreground md:text-base">
                爲每組能力設置默認引擎、決定哪些引擎出現在各頁的選擇清單裏；保存後立即生效，登錄後多設備同步同一套配置。
              </p>
            </div>
          </section>

          <div className="flex flex-col gap-6">
            <StSyncBanner loggedIn={p.loggedIn} savePhase={p.savePhase} />

            {p.listLoading ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card py-16 text-sm text-muted-foreground shadow-md">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                正在加載引擎清單…
              </div>
            ) : (
              <section className="grid gap-5 lg:grid-cols-2">
                {p.groups.map((g, idx) => (
                  <div
                    key={g.group}
                    className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                    style={{ animationDelay: `${idx * 70}ms` }}
                  >
                    <StGroupCard
                      icon={GROUP_ICONS[g.group]}
                      title={g.title}
                      tagline={g.tagline}
                      engines={g.engines}
                      defaultSlug={p.groupDefaultOf(g.group)}
                      isDisabled={slug => p.isEngineDisabled(g.group, slug)}
                      onSetDefault={slug => p.handleSetDefault(g.group, slug)}
                      onToggle={slug => p.handleToggleEngine(g.group, slug)}
                    />
                  </div>
                ))}
              </section>
            )}

            <StBillingNote onReset={p.handleReset} />
          </div>
        </main>
      </div>

      {p.toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2 duration-300 rounded-full bg-foreground px-5 py-2.5 text-sm text-background shadow-lg">
          {p.toast}
        </div>
      )}
    </div>
  )
}
