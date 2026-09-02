import { Link } from "react-router-dom"
import { Lock, Loader2 } from "lucide-react"
import type { AdminGate } from "@/pages/Admin/useAdmin"

interface AdGateProps {
  gate: AdminGate
}

// 未登錄 / 非管理員訪問 /admin 時的攔截頁
export function AdGate({ gate }: AdGateProps) {
  if (gate === "checking") {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-7xl flex-col items-center justify-center gap-3 px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
        <p className="text-sm text-muted-foreground">正在確認身份…</p>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-7xl flex-col items-center justify-center px-4 py-16 text-center">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-10 shadow-lg">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <Lock className="h-8 w-8 text-destructive" aria-hidden />
        </span>
        <h1 className="mt-6 text-2xl font-bold">沒有權限</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {gate === "guest"
            ? "管理後台僅開放給管理員，請先登錄你的賬號。"
            : "這個頁面僅開放給管理員，你的賬號不在管理員名單內。"}
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          返回首頁
        </Link>
      </div>
    </main>
  )
}
