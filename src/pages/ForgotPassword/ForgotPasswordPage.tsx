import { Link } from 'react-router-dom'
import { Sparkles, Loader2, ArrowLeft, Mail } from 'lucide-react'
import type { useForgotPassword } from './useForgotPassword'

export function ForgotPasswordPage(p: ReturnType<typeof useForgotPassword>) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 text-foreground">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/70 via-background to-background" />
        <div className="absolute -top-20 left-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-8 h-80 w-80 rounded-full bg-secondary blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <Link
          to="/login"
          className="mb-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          返回登錄
        </Link>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-lg">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary shadow-md">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </span>
            <div>
              <h1 className="text-2xl font-bold">重置密碼</h1>
              <p className="text-xs text-muted-foreground">輸入註冊時使用的郵箱</p>
            </div>
          </div>

          {p.errorMsg && (
            <div className="mb-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{p.errorMsg}</div>
          )}

          {p.phase === 'sent' ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-8 text-center">
              <Mail className="h-10 w-10 text-primary" />
              <p className="text-sm font-medium text-foreground">重置連結已發送</p>
              <p className="text-xs text-muted-foreground">
                請檢查 {p.email} 的收件箱（包括垃圾郵件）
              </p>
              <Link
                to="/login"
                className="mt-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-md"
              >
                返回登錄
              </Link>
            </div>
          ) : (
            <form onSubmit={p.handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="fp-email" className="mb-1.5 block text-sm font-medium">
                  郵箱
                </label>
                <input
                  id="fp-email"
                  type="email"
                  value={p.email}
                  onChange={e => p.setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
              <button
                type="submit"
                disabled={p.phase === 'submitting'}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-base font-bold text-primary-foreground shadow-lg transition-all hover:scale-105 disabled:pointer-events-none disabled:opacity-50"
              >
                {p.phase === 'submitting' && <Loader2 className="h-4 w-4 animate-spin" />}
                發送重置連結
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
