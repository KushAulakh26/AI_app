import { Smartphone, Loader2, Bookmark, BookmarkCheck, FileOutput, ImageIcon } from 'lucide-react'
import type { useDetail, DetailBlockSlot, LayoutImage } from '@/pages/Detail/useDetail'

function PreviewBlock({ slot }: { slot: DetailBlockSlot | undefined }) {
  if (!slot) {
    return <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">生成文案後自動填入</p>
  }
  if (slot.jobStatus === 'running') {
    return (
      <p className="flex items-center justify-center gap-2 rounded-lg bg-muted/50 px-3 py-4 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        正在寫作…
      </p>
    )
  }
  if (slot.jobStatus === 'failed' || !slot.text) {
    return <p className="rounded-lg bg-muted/40 px-3 py-4 text-center text-xs text-muted-foreground">此區塊暫無內容</p>
  }
  return <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{slot.text}</p>
}

function PreviewImages({ images }: { images: LayoutImage[] }) {
  if (!images.length) return null
  return (
    <div className={images.length === 1 ? 'space-y-2' : 'grid grid-cols-2 gap-2'}>
      {images.map(img => (
        <img key={img.imageId} src={img.url} alt={img.sourceLabel} className="w-full rounded-lg object-cover shadow-sm" loading="lazy" />
      ))}
    </div>
  )
}

export function DpPreviewPanel(p: ReturnType<typeof useDetail>) {
  const slotOf = (blockId: string) => p.detailSlots.find(s => s.blockId === blockId)
  const heroImage = p.layoutImages[0]
  const midImages = p.layoutImages.slice(1, 3)
  const tailImages = p.layoutImages.slice(3)

  return (
    <section className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-md">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Smartphone className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-lg font-bold">詳情頁預覽</h2>
          <p className="text-xs text-muted-foreground">按手機端詳情頁的圖文順序實時拼裝</p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          disabled={!p.hasPreviewContent || p.savedAll}
          onClick={p.handleSaveAll}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
            p.savedAll
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-border bg-background text-foreground hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-40'
          }`}
        >
          {p.savedAll ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
          {p.savedAll ? '已保存整套' : '保存整套'}
        </button>
        <button
          type="button"
          onClick={p.handleExportAll}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-md transition-transform hover:scale-105"
        >
          <FileOutput className="h-3.5 w-3.5" />
          導出整篇文案
        </button>
      </div>

      <div className="flex flex-1 justify-center overflow-y-auto rounded-xl bg-secondary/40 p-4">
        <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-background shadow-lg">
          <div className="flex items-center justify-center gap-1.5 border-b border-border/60 bg-card px-4 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <p className="truncate text-xs font-medium text-muted-foreground">
              {p.productName.trim() || '商品詳情頁'}
            </p>
          </div>

          <div className="space-y-4 p-4">
            {heroImage ? (
              <img src={heroImage.url} alt="主圖" className="w-full rounded-xl object-cover shadow-md" />
            ) : (
              <div className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 text-muted-foreground">
                <ImageIcon className="h-8 w-8" />
                <p className="text-xs">主圖位 · 選一張圖放這裏</p>
              </div>
            )}

            <div>
              <p className="mb-1.5 text-xs font-bold text-primary">主圖標題</p>
              <PreviewBlock slot={slotOf('hero-title')} />
            </div>

            <div>
              <p className="mb-1.5 text-xs font-bold text-primary">賣點模塊</p>
              <PreviewBlock slot={slotOf('selling-points')} />
            </div>

            <PreviewImages images={midImages} />

            <div>
              <p className="mb-1.5 text-xs font-bold text-primary">規格參數</p>
              <PreviewBlock slot={slotOf('spec-params')} />
            </div>

            <div>
              <p className="mb-1.5 text-xs font-bold text-primary">詳情描述</p>
              <PreviewBlock slot={slotOf('detail-desc')} />
            </div>

            <PreviewImages images={tailImages} />
          </div>
        </div>
      </div>
    </section>
  )
}
