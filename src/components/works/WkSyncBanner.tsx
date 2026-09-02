import { CheckCircle2, CloudUpload, Loader2, LogIn, RefreshCw } from 'lucide-react'
import type { SyncPhase } from '@/pages/Works/useWorks'

interface WkSyncBannerProps {
  loggedIn: boolean
  syncPhase: SyncPhase
  unsyncedCount: number
  noticeText: string | null
  onRetrySync: () => void
  onGoLogin: () => void
}

export function WkSyncBanner({ loggedIn, syncPhase, unsyncedCount, noticeText, onRetrySync, onGoLogin }: WkSyncBannerProps) {
  if (!loggedIn) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-md sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <CloudUpload className="h-5 w-5 text-primary" />
          </span>
          <div>
            <p className="text-sm font-semibold">現在展示的是這臺設備上的作品</p>
            <p className="mt-0.5 text-xs text-muted-foreground">登錄後，全部作品會同步到雲端，換臺設備登錄也能看到。</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onGoLogin}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-md transition-all hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <LogIn className="h-4 w-4" />
          登錄並同步
        </button>
      </div>
    )
  }

  if (syncPhase === 'syncing') {
    return (
      <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        正在把本機作品同步到雲端…
      </div>
    )
  }

  if (syncPhase === 'error') {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-destructive/40 bg-card p-4 shadow-md sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-destructive">{noticeText || '雲端同步出了點問題'}</p>
        <button
          type="button"
          onClick={onRetrySync}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium shadow-sm transition-all hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <RefreshCw className="h-4 w-4" />
          重新同步
        </button>
      </div>
    )
  }

  if (syncPhase === 'done' && unsyncedCount > 0) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-md sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">還有 {unsyncedCount} 件本機作品沒同步上雲。</p>
        <button
          type="button"
          onClick={onRetrySync}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium shadow-sm transition-all hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <RefreshCw className="h-4 w-4" />
          重新同步
        </button>
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
      <CheckCircle2 className="h-3.5 w-3.5" />
      雲端同步已開啓，作品跟着賬號走
    </div>
  )
}
