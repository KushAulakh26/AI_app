import { Link } from "react-router-dom"
import { ArrowRight, Sparkles } from "lucide-react"
import type { NavLinkItem } from "@/pages/Home/useHome"

interface CtaFooterProps {
  navLinks: NavLinkItem[]
}

export function CtaFooter({ navLinks }: CtaFooterProps) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
      <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-14 text-center shadow-lg md:px-12 md:py-16">
        <div
          className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-primary-foreground/10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-primary-foreground/10"
          aria-hidden
        />

        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-4 py-1.5 text-xs font-semibold text-primary-foreground">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            從 AI 模特圖開始
          </span>
          <h2 className="mt-5 text-2xl font-bold leading-tight text-primary-foreground md:text-3xl">
            現在，把你的商品圖
            <br className="md:hidden" />
            變成整套電商內容
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base text-primary-foreground/80">
            上傳一張商品圖，模特圖、場景圖、文案、詳情頁、視頻腳本逐個出，全部存進你的作品庫。
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/model-gen"
              className="inline-flex items-center gap-2 rounded-full bg-primary-foreground px-8 py-3 text-base font-bold text-primary shadow-md transition-transform hover:scale-105 focus-visible:shadow-focus"
            >
              開始創作
              <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
            <Link
              to="/works"
              className="rounded-full border border-primary-foreground/40 px-6 py-3 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/10"
            >
              看看我的作品
            </Link>
          </div>
        </div>
      </div>

      <footer className="mt-16 border-t border-border pb-6 pt-8">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" aria-hidden />
            </span>
            <span className="text-sm font-bold text-foreground">零壹電商寶</span>
            <span className="text-sm text-muted-foreground">· 電商內容生產工作臺</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-4">
            {navLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </section>
  )
}
