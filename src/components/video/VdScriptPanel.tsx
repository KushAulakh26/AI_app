import { Film, Loader2, Share2, BookmarkCheck, Sparkles, Trash2, Clock, Music4, MessageSquareText } from 'lucide-react'
import type { useVideo } from '@/pages/Video/useVideo'

export function VdScriptPanel(p: ReturnType<typeof useVideo>) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-md">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Film className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-lg font-bold">分鏡腳本</h2>
            <p className="text-xs text-muted-foreground">逐鏡改寫、刪鏡，整篇可導出</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
            {p.shots.length} 個鏡頭
          </span>
          <button
            type="button"
            onClick={p.handleExportScript}
            disabled={p.shots.length === 0}
            className="flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-40"
          >
            <Share2 className="h-3.5 w-3.5" />
            導出整篇
          </button>
          <button
            type="button"
            onClick={p.handleSaveAll}
            disabled={p.savedAll || p.shots.length === 0}
            className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:pointer-events-none disabled:opacity-40"
          >
            <BookmarkCheck className="h-3.5 w-3.5" />
            {p.savedAll ? '已保存整套' : '保存整套'}
          </button>
        </div>
      </div>

      {p.scriptJobStatus === 'running' && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-background/70 px-5 py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <div>
            <p className="text-sm font-medium">正在編寫分鏡腳本…</p>
            <p className="text-xs text-muted-foreground">導演正在排鏡頭，大約需要 20-40 秒</p>
          </div>
        </div>
      )}

      {p.scriptJobStatus === 'failed' && p.scriptError && (
        <div className="mb-3 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{p.scriptError}</div>
      )}

      {p.shots.length === 0 && p.scriptJobStatus !== 'running' && (
        <div className="rounded-xl border-2 border-dashed border-border bg-background/50 px-4 py-10 text-center">
          <p className="text-sm font-medium text-foreground">腳本還沒生成</p>
          <p className="mt-1 text-xs text-muted-foreground">填好左側商品信息，點「生成分鏡腳本」，鏡頭卡片會出現在這裏</p>
        </div>
      )}

      <div className="space-y-3">
        {p.shots.map(shot => (
          <article
            key={shot.shotId}
            className="animate-in fade-in slide-in-from-bottom-2 rounded-xl border border-border bg-background p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {shot.shotNo}
              </span>
              <span className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                <Clock className="h-3 w-3" />
                {shot.duration}
              </span>
              {shot.music && (
                <span className="flex min-w-0 items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
                  <Music4 className="h-3 w-3 shrink-0" />
                  <span className="max-w-48 truncate">{shot.music}</span>
                </span>
              )}
              <span className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => p.handleRewriteShot(shot.shotId)}
                  disabled={shot.rewriteStatus === 'running'}
                  className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-primary disabled:pointer-events-none disabled:opacity-40"
                >
                  {shot.rewriteStatus === 'running' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  改寫
                </button>
                <button
                  type="button"
                  onClick={() => p.handleDeleteShot(shot.shotId)}
                  className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
                  title="刪除這個鏡頭"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </span>
            </div>
            <p className="text-sm leading-relaxed text-foreground">{shot.visual}</p>
            {shot.dialogue && (
              <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                <MessageSquareText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                臺詞/字幕：{shot.dialogue}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
