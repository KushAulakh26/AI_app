import { Film, Layers, Play, Quote } from 'lucide-react'
import type { WorkItem } from '@/pages/Works/useWorks'

interface WkWorksGridProps {
  items: WorkItem[]
  onOpen: (item: WorkItem) => void
}

const KIND_LABELS: Record<WorkItem['kind'], string> = {
  model: '模特圖',
  scene: '場景圖',
  copy: '文案',
  detail_set: '詳情頁',
  video: '視頻',
  tool: '圖片工具',
}

function formatWorkTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  if (diffMs < 60_000) return '剛剛'
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)} 分鐘前`
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)} 小時前`
  if (diffMs < 7 * 86_400_000) return `${Math.floor(diffMs / 86_400_000)} 天前`
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function SourceChip({ source }: { source: WorkItem['source'] }) {
  if (source === 'cloud') {
    return (
      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary backdrop-blur-sm">
        雲端
      </span>
    )
  }
  return <span className="rounded-full bg-background/80 px-2 py-0.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">本機</span>
}

export function WkWorksGrid({ items, onOpen }: WkWorksGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item, idx) => (
        <article
          key={item.workKey}
          onClick={() => onOpen(item)}
          className="group animate-in fade-in slide-in-from-bottom-4 cursor-pointer overflow-hidden rounded-2xl border border-border bg-card shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ animationDelay: `${Math.min(idx, 8) * 40}ms` }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onOpen(item)
            }
          }}
        >
          {(item.assetType === 'image' || item.assetType === 'video') && (
            <div className="relative aspect-square w-full overflow-hidden bg-muted">
              {item.mediaUrl ? (
                item.assetType === 'image' ? (
                  <img
                    src={item.mediaUrl}
                    alt={item.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <video src={item.mediaUrl} muted preload="metadata" className="h-full w-full object-cover" />
                )
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-foreground/90">
                  <Play className="h-10 w-10 text-primary-foreground/80" />
                </div>
              )}
              {item.assetType === 'video' && item.mediaUrl && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-background/70 shadow-md backdrop-blur-sm transition-transform group-hover:scale-110">
                    <Play className="h-5 w-5 text-foreground" />
                  </span>
                </span>
              )}
              <span className="absolute left-2 top-2 rounded-full bg-background/80 px-2 py-0.5 text-xs font-medium backdrop-blur-sm">
                {KIND_LABELS[item.kind]}
              </span>
              <span className="absolute right-2 top-2">
                <SourceChip source={item.source} />
              </span>
            </div>
          )}

          {item.assetType === 'text' && (
            <div className="relative flex aspect-square flex-col gap-2 p-4">
              <div className="flex items-center justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <Quote className="h-4 w-4 text-primary" />
                </span>
                <SourceChip source={item.source} />
              </div>
              <p className="line-clamp-6 flex-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {item.textContent || ''}
              </p>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground self-start">
                {KIND_LABELS[item.kind]}
              </span>
            </div>
          )}

          {item.assetType === 'detail_set' && (
            <div className="relative flex aspect-square flex-col bg-gradient-to-br from-primary/15 via-secondary to-card p-4">
              <div className="flex items-center justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary shadow-md">
                  <Layers className="h-4 w-4 text-primary-foreground" />
                </span>
                <SourceChip source={item.source} />
              </div>
              <div className="mt-3 flex flex-1 flex-col gap-1.5">
                {(item.detailPayload?.blocks || []).slice(0, 4).map((b) => (
                  <span key={b.blockId} className="rounded-full bg-background/80 px-2.5 py-1 text-xs text-foreground/80 backdrop-blur-sm">
                    {b.label}
                  </span>
                ))}
              </div>
              <span className="self-start rounded-full bg-background/80 px-2 py-0.5 text-xs font-medium backdrop-blur-sm">
                詳情頁 · {item.detailPayload?.blocks.length || 0} 個區塊
              </span>
            </div>
          )}

          {item.assetType === 'video_set' && (
            <div className="relative flex aspect-square flex-col bg-gradient-to-br from-secondary via-card to-primary/10 p-4">
              <div className="flex items-center justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary shadow-md">
                  <Film className="h-4 w-4 text-primary-foreground" />
                </span>
                <SourceChip source={item.source} />
              </div>
              <div className="flex flex-1 flex-col items-start justify-center gap-2">
                <span className="rounded-full bg-background/80 px-3 py-1 text-sm font-semibold backdrop-blur-sm">
                  {item.videoPayload?.shots.length || 0} 個分鏡
                </span>
                <span className="rounded-full bg-background/80 px-3 py-1 text-sm backdrop-blur-sm">
                  {item.videoPayload?.videos.length || 0} 段視頻已生成
                </span>
              </div>
              <span className="self-start rounded-full bg-background/80 px-2 py-0.5 text-xs font-medium backdrop-blur-sm">
                視頻整套
              </span>
            </div>
          )}

          <div className="border-t border-border/60 p-3">
            <p className="line-clamp-1 text-sm font-semibold">{item.title}</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="line-clamp-1 flex-1 text-xs text-muted-foreground">{item.summary || '—'}</p>
              <p className="shrink-0 text-xs text-muted-foreground">{formatWorkTime(item.createdIso)}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
