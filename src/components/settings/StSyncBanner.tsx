import { Link } from 'react-router-dom'
import { Cloud, CloudOff, Loader2 } from 'lucide-react'
import type { SavePhase } from '@/pages/Settings/useSettings'

interface StSyncBannerProps {
  loggedIn: boolean
  savePhase: SavePhase
}

export function StSyncBanner({ loggedIn, savePhase }: StSyncBannerProps) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-md sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            loggedIn ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
          }`}
        >
          {loggedIn ? <Cloud className="h-5 w-5" aria-hidden /> : <CloudOff className="h-5 w-5" aria-hidden />}
        </span>
        <div>
          <p className="text-sm font-bold">{loggedIn ? '設置已雲端同步' : '設置目前只保存在這臺設備'}</p>
          <p className="text-xs text-muted-foreground">
            {loggedIn ? '換設備登錄，也是同一套引擎配置' : '登錄後設置將上傳雲端，多設備通用'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {savePhase === 'saving' && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            正在保存…
          </span>
        )}
        {savePhase === 'saved' && (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">已保存</span>
        )}
        {savePhase === 'error' && (
          <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
            同步失敗，已留在本機
          </span>
        )}
        {!loggedIn && (
          <Link
            to="/login"
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            登錄同步
          </Link>
        )}
      </div>
    </section>
  )
}
