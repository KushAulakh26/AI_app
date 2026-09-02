import { Link } from "react-router-dom"
import {
  ArrowRight,
  Check,
  Clapperboard,
  ImagePlus,
  LayoutTemplate,
  PenLine,
  Shirt,
  Wand2,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { FeatureItem } from "@/pages/Home/useHome"

interface FeatureModulesProps {
  features: FeatureItem[]
  toolItems: string[]
}

const FEATURE_ICONS: Record<string, LucideIcon> = {
  model: Shirt,
  scene: ImagePlus,
  copy: PenLine,
  detail: LayoutTemplate,
  video: Clapperboard,
}

export function FeatureModules({ features, toolItems }: FeatureModulesProps) {
  const featured = features[0]
  const rest = features.slice(1)

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-primary">
            Features · 內容能力
          </p>
          <h2 className="mt-3 text-2xl font-bold leading-tight text-foreground md:text-3xl">
            一套工作臺，包辦電商內容
          </h2>
        </div>
        <p className="max-w-md text-base text-muted-foreground">
          從模特上身圖到短視頻腳本，每個模塊都能單獨用，也能圍着同一張商品圖連着出。
        </p>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {/* 主推：AI 模特圖 */}
        <article className="relative overflow-hidden rounded-2xl bg-primary p-8 text-primary-foreground shadow-lg transition-transform hover:-translate-y-1 md:col-span-2">
          <div
            className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-primary-foreground/10"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-20 right-24 h-40 w-40 rounded-full bg-primary-foreground/10"
            aria-hidden
          />
          <div className="relative flex h-full flex-col md:flex-row md:items-center md:gap-10">
            <div className="flex-1">
              {featured.tag && (
                <span className="inline-block rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-semibold text-primary-foreground">
                  {featured.tag}
                </span>
              )}
              <h3 className="mt-3 text-xl font-bold md:text-2xl">{featured.title}</h3>
              <p className="mt-2 max-w-md text-sm text-primary-foreground/85">
                {featured.desc}
              </p>
              <ul className="mt-4 space-y-2">
                {featured.bullets?.map((bullet) => (
                  <li key={bullet} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 shrink-0 text-primary-foreground" aria-hidden />
                    {bullet}
                  </li>
                ))}
              </ul>
              <Link
                to={featured.to}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary-foreground px-5 py-2.5 text-sm font-bold text-primary shadow-md transition-transform hover:scale-105 focus-visible:shadow-focus"
              >
                去生成模特圖
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <div className="mt-6 hidden shrink-0 md:mt-0 md:block">
              <div className="flex h-44 w-36 rotate-2 flex-col items-center justify-end rounded-2xl bg-primary-foreground/15 pb-4 shadow-md">
                <div className="h-10 w-10 rounded-full bg-primary-foreground/80" />
                <div className="mt-1.5 h-24 w-16 rounded-t-full bg-primary-foreground/80" />
              </div>
            </div>
          </div>
        </article>

        {rest.map((feature) => {
          const Icon = FEATURE_ICONS[feature.key] ?? Wand2
          return (
            <article
              key={feature.key}
              className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-md transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-4 text-lg font-bold text-foreground">{feature.title}</h3>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{feature.desc}</p>
              <Link
                to={feature.to}
                className="mt-4 inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary transition-colors hover:text-foreground"
              >
                去試試
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </article>
          )
        })}

        {/* 圖片工具條 */}
        <article className="rounded-2xl border-2 border-dashed border-border bg-card p-6 shadow-sm md:col-span-2 lg:col-span-3">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
            <div className="flex items-center gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Wand2 className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h3 className="text-lg font-bold text-foreground">圖片工具</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  上架前後的小修小補，在這裏一站搞定。
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
              {toolItems.map((tool) => (
                <span
                  key={tool}
                  className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
                >
                  {tool}
                </span>
              ))}
              <Link
                to="/tools"
                className="ml-1 inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors hover:text-foreground"
              >
                去使用
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </article>
      </div>
    </section>
  )
}
