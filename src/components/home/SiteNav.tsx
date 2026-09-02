import { Link } from "react-router-dom"
import { Sparkles } from "lucide-react"
import type { NavLinkItem } from "@/pages/Home/useHome"
import { AdminEntryLink } from "@/components/admin/AdminEntryLink"
import { LocalAccountMenu } from "@/components/local/LocalAccountMenu"

interface SiteNavProps {
  navLinks: NavLinkItem[]
}

export function SiteNav({ navLinks }: SiteNavProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
            <Sparkles className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-lg font-bold text-foreground">零壹電商寶</span>
          <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
            AI
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <AdminEntryLink />
          {/* 用 LocalAccountMenu 取代寫死的「登錄」連結：它自己按登錄態渲染
              （未登錄→登錄/註冊；已登錄→頭像＋暱稱＋退出）。原本寫死連結，
              登錄後首頁仍舊顯示「登錄」，看起來像沒登入成功。 */}
          <LocalAccountMenu />
          <Link
            to="/model-gen"
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md transition-transform hover:scale-105 focus-visible:shadow-focus"
          >
            開始創作
          </Link>
        </div>
      </div>
    </header>
  )
}
