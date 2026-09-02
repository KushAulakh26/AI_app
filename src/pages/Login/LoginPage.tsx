import { Link } from 'react-router-dom'
import { Sparkles, Loader2, ArrowLeft } from 'lucide-react'
import type { useLogin } from './useLogin'

export function LoginPage(p: ReturnType<typeof useLogin>) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 text-foreground">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/70 via-background to-background" />
        <div className="absolute -top-20 left-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-8 h-80 w-80 rounded-full bg-secondary blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          返回首頁
        </Link>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-lg">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary shadow-md">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </span>
            <div>
              <h1 className="text-2xl font-bold">登錄</h1>
              <p className="text-xs text-muted-foreground">登錄後保存作品、開始生成</p>
            </div>
          </div>

          {p.errorMsg && (
            <div className="mb-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{p.errorMsg}</div>
          )}

          <form onSubmit={p.handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium">
                郵箱
              </label>
              <input
                id="login-email"
                type="email"
                value={p.email}
                onChange={e => p.setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium">
                密碼
              </label>
              <input
                id="login-password"
                type="password"
                value={p.password}
                onChange={e => p.setPassword(e.target.value)}
                placeholder="至少 8 位"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
            <button
              type="submit"
              disabled={p.isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-base font-bold text-primary-foreground shadow-lg transition-all hover:scale-105 disabled:pointer-events-none disabled:opacity-50"
            >
              {p.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              登錄
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm">
            <Link to="/forgot-password" className="font-medium text-primary hover:underline">
              忘記密碼？
            </Link>
            <span className="text-muted-foreground">
              沒有賬號？
              <Link to="/register" className="ml-1 font-medium text-primary hover:underline">
                去註冊
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
