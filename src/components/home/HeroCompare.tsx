import { Link } from "react-router-dom"
import { ArrowRight, ChevronsLeftRight, Sparkles } from "lucide-react"

const HERO_BEFORE_IMAGE = "/hero-before.jpeg"
const HERO_AFTER_IMAGE = "/hero-after.jpeg"
import type { HeroStat } from "@/pages/Home/useHome"

interface HeroCompareProps {
  splitPos: number
  onSplitChange: (value: number) => void
  heroStats: HeroStat[]
  scrollToCases: () => void
}

export function HeroCompare({
  splitPos,
  onSplitChange,
  heroStats,
  scrollToCases,
}: HeroCompareProps) {
  return (
    <section className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-primary/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-24 top-40 h-64 w-64 rounded-full bg-accent blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:px-6 md:py-24 lg:grid-cols-[5fr_6fr]">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <p className="font-mono text-xs uppercase tracking-widest text-primary">
            AI Ecommerce Content Studio
          </p>
          <h1 className="mt-4 text-3xl font-bold leading-tight text-foreground md:text-4xl">
            一張商品圖
            <br />
            生成
            <span className="rounded-xl bg-primary/10 px-2 text-primary">整套</span>
            電商內容
          </h1>
          <p className="mt-5 max-w-md text-base text-muted-foreground">
            模特圖、場景圖、營銷文案、商品詳情頁、短視頻腳本——上傳一張商品圖，把電商要用的內容一次備齊。
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/model-gen"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-base font-bold text-primary-foreground shadow-md transition-transform hover:scale-105 focus-visible:shadow-focus"
            >
              開始創作
              <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
            <button
              type="button"
              onClick={scrollToCases}
              className="rounded-full border border-border bg-card px-6 py-3 text-base font-semibold text-card-foreground shadow-sm transition-all hover:shadow-md"
            >
              看看案例效果
            </button>
          </div>

          <dl className="mt-10 flex divide-x divide-border">
            {heroStats.map((stat, idx) => (
              <div key={stat.label} className={idx === 0 ? "pr-6" : "px-6"}>
                <dt className="sr-only">{stat.label}</dt>
                <dd className="text-2xl font-bold text-foreground">{stat.value}</dd>
                <dd className="mt-1 text-sm text-muted-foreground">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
            <div className="relative aspect-[4/5] bg-muted">
              {/* After image stays beneath the clipped original so the slider reveals the real result. */}
              <img
                src={HERO_AFTER_IMAGE}
                alt="生成後：模特穿著深藍大衣走在城市街道"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <span className="absolute right-3 top-3 z-[1] rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
                生成後 · AI 模特圖
              </span>
              <div className="absolute bottom-3 right-3 z-[1] flex gap-2">
                <span className="rounded-full bg-card/90 px-3 py-1 text-xs font-semibold text-card-foreground shadow-sm">換背景</span>
                <span className="rounded-full bg-card/90 px-3 py-1 text-xs font-semibold text-card-foreground shadow-sm">換姿勢</span>
              </div>

              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - splitPos}% 0 0)` }}
              >
                <img
                  src={HERO_BEFORE_IMAGE}
                  alt="生成前：深藍大衣與長褲的透明底商品圖"
                  className="h-full w-full object-cover"
                />
                <span className="absolute left-3 top-3 rounded-full bg-background/90 px-3 py-1 text-xs font-semibold text-foreground shadow-sm">
                  生成前 · 原商品圖
                </span>
              </div>

              {/* 分割線與滑塊 */}
              <div
                className="absolute inset-y-0 z-10 w-0.5 bg-card shadow-md"
                style={{ left: `${splitPos}%` }}
              >
                <span className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-primary shadow-md">
                  <ChevronsLeftRight className="h-4 w-4" aria-hidden />
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={splitPos}
                onChange={(e) => onSplitChange(Number(e.target.value))}
                aria-label="拖動查看生成前後對比"
                className="absolute inset-0 z-20 h-full w-full cursor-ew-resize opacity-0"
              />
            </div>
          </div>

          <div className="relative z-10 -bottom-5 -left-4 inline-flex -rotate-3 items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2 shadow-lg">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden />
            <span className="text-sm font-semibold text-foreground">無需棚拍 · 秒級出圖</span>
          </div>
        </div>
      </div>
    </section>
  )
}
