import { Link } from "react-router-dom"
import { ArrowLeft, ShieldCheck } from "lucide-react"
import { LocalAccountMenu } from "@/components/local/LocalAccountMenu"

export function AdTopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4" />
            返回首頁
          </Link>
          <span className="hidden h-6 w-px bg-border sm:block" />
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary shadow-md">
              <ShieldCheck className="h-5 w-5 text-primary-foreground" />
            </span>
            <div>
              <p className="text-base font-bold leading-tight">零壹電商寶</p>
              <p className="text-xs text-muted-foreground">管理後台</p>
            </div>
          </div>
        </div>
        <LocalAccountMenu />
      </div>
    </header>
  )
}
