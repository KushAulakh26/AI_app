import { Check, Copy, Download, Film, Layers, Trash2, Wand2, X } from 'lucide-react'
import type { ContinueTarget, WorkItem } from '@/pages/Works/useWorks'

interface WkDetailDialogProps {
  item: WorkItem | null
  copiedKey: string | null
  onClose: () => void
  onCopyText: (text: string, key: string) => void
  onDownload: (item: WorkItem) => void
  onAskDelete: (item: WorkItem) => void
  onContinue: (item: WorkItem, target: ContinueTarget) => void
}

const KIND_LABELS: Record<WorkItem['kind'], string> = {
  model: '模特圖',
  scene: '場景圖',
  copy: '文案',
  detail_set: '詳情頁',
  video: '視頻',
  tool: '圖片工具',
}

function formatFullTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(
    d.getHours(),
  ).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function WkDetailDialog({ item, copiedKey, onClose, onCopyText, onDownload, onAskDelete, onContinue }: WkDetailDialogProps) {
  if (!item) return null

  const copyText =
    item.assetType === 'text'
      ? item.textContent || ''
      : item.assetType === 'detail_set'
        ? (item.detailPayload?.blocks || []).map((b) => `【${b.label}】\n${b.text}`).join('\n\n')
        : item.assetType === 'video_set'
          ? (item.videoPayload?.shots || [])
              .map((s) => `鏡頭${s.shotNo}\n畫面：${s.visual}\n臺詞：${s.dialogue}\n時長：${s.duration}`)
              .join('\n\n')
          : ''
  const copyKey = `detail-${item.workKey}`
  const canCopy = copyText.length > 0
  const canContinue = item.assetType === 'image' && !!item.mediaUrl

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-full w-full max-w-3xl animate-in fade-in zoom-in-95 duration-300 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              {KIND_LABELS[item.kind]}
            </span>
            <p className="truncate text-base font-bold">{item.title}</p>
            <p className="hidden shrink-0 text-xs text-muted-foreground sm:block">{formatFullTime(item.createdIso)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {item.assetType === 'image' && item.mediaUrl && (
            <img src={item.mediaUrl} alt={item.title} className="mx-auto max-h-96 w-auto rounded-xl bg-muted object-contain shadow-md" />
          )}

          {item.assetType === 'video' &&
            (item.mediaUrl ? (
              <video src={item.mediaUrl} controls className="mx-auto max-h-96 w-full rounded-xl bg-foreground shadow-md" />
            ) : (
              <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">視頻地址不可用。</p>
            ))}

          {item.assetType === 'text' && (
            <div className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-xl border border-border/60 bg-muted/50 p-4 text-sm leading-relaxed">
              {item.textContent}
            </div>
          )}

          {item.assetType === 'detail_set' && item.detailPayload && (
            <div className="flex flex-col gap-4">
              {(item.detailPayload.imageUrls || []).length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {item.detailPayload.imageUrls.map((u, i) => (
                    <img
                      key={`${u}-${i}`}
                      src={u}
                      alt={`詳情圖 ${i + 1}`}
                      className="h-24 w-24 shrink-0 rounded-xl border border-border object-cover shadow-sm"
                    />
                  ))}
                </div>
              )}
              {item.detailPayload.blocks.map((b) => (
                <div key={b.blockId} className="rounded-xl border border-border/60 bg-muted/40 p-4">
                  <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    <Layers className="h-3.5 w-3.5" />
                    {b.label}
                  </span>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{b.text}</p>
                </div>
              ))}
            </div>
          )}

          {item.assetType === 'video_set' && item.videoPayload && (
            <div className="flex flex-col gap-4">
              {(item.videoPayload.videos || []).length > 0 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {item.videoPayload.videos.map((v) => (
                    <div key={v.shotId} className="overflow-hidden rounded-xl border border-border shadow-sm">
                      <video src={v.url} controls className="aspect-video w-full bg-foreground" />
                      <p className="bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">鏡頭 {v.shotNo}</p>
                    </div>
                  ))}
                </div>
              )}
              {item.videoPayload.shots.map((s) => (
                <div key={`${s.shotNo}-${s.visual.slice(0, 8)}`} className="rounded-xl border border-border/60 bg-muted/40 p-4">
                  <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    <Film className="h-3.5 w-3.5" />
                    鏡頭 {s.shotNo} · {s.duration || '時長未定'}
                  </span>
                  <p className="text-sm leading-relaxed">{s.visual}</p>
                  {s.dialogue && <p className="mt-1.5 text-sm text-muted-foreground">臺詞：{s.dialogue}</p>}
                </div>
              ))}
            </div>
          )}

          {canContinue && (
            <div className="mt-5 rounded-2xl border border-border bg-gradient-to-br from-secondary/70 to-card p-4 shadow-sm">
              <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
                <Wand2 className="h-4 w-4 text-primary" />
                拿這張圖繼續加工
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onContinue(item, 'scene')}
                  className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium shadow-sm transition-all hover:scale-105 hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  做場景圖
                </button>
                <button
                  type="button"
                  onClick={() => onContinue(item, 'video')}
                  className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium shadow-sm transition-all hover:scale-105 hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  當視頻首幀
                </button>
                <button
                  type="button"
                  onClick={() => onContinue(item, 'tools')}
                  className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium shadow-sm transition-all hover:scale-105 hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  圖片工具繼續處理
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border/70 px-5 py-3.5">
          {canCopy && (
            <button
              type="button"
              onClick={() => onCopyText(copyText, copyKey)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium shadow-sm transition-all hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {copiedKey === copyKey ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              {copiedKey === copyKey ? '已複製' : '複製全文'}
            </button>
          )}
          <button
            type="button"
            onClick={() => onDownload(item)}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-md transition-all hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Download className="h-4 w-4" />
            下載
          </button>
          <button
            type="button"
            onClick={() => onAskDelete(item)}
            className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 bg-background px-4 py-2 text-sm font-medium text-destructive shadow-sm transition-all hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Trash2 className="h-4 w-4" />
            刪除
          </button>
        </div>
      </div>
    </div>
  )
}
