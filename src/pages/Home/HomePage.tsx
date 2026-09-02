import type { useHome } from "./useHome"
import { SiteNav } from "@/components/home/SiteNav"
import { HeroCompare } from "@/components/home/HeroCompare"
import { FeatureModules } from "@/components/home/FeatureModules"
import { CaseWall } from "@/components/home/CaseWall"
import { CtaFooter } from "@/components/home/CtaFooter"

export function HomePage(p: ReturnType<typeof useHome>) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        跳到主要內容
      </a>
      <SiteNav navLinks={p.navLinks} />
      <main id="main-content">
        <HeroCompare
          splitPos={p.splitPos}
          onSplitChange={p.onSplitChange}
          heroStats={p.heroStats}
          scrollToCases={p.scrollToCases}
        />
        <FeatureModules features={p.features} toolItems={p.toolItems} />
        <CaseWall cases={p.cases} />
        <CtaFooter navLinks={p.navLinks} />
      </main>
    </div>
  )
}
