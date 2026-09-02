import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { Images, Upload, Check, ChevronUp, ChevronDown, Trash2 } from 'lucide-react'
import type { useDetail, LayoutImage } from '@/pages/Detail/useDetail'

export function DpImagePanel(p: ReturnType<typeof useDetail>) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  function handlePickFiles() {
    fileInputRef.current?.click()
  }

  function isSelected(img: LayoutImage) {
    return p.layoutImages.some(x => x.imageId === img.imageId)
  }

  return (
    <section className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-md">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Images className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-lg font-bold">圖片排版</h2>
          <p className="text-xs text-muted-foreground">選圖、傳圖、調順序都在這完成，不消耗 AI 額度</p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => {
          p.handleUploadFiles(e.target.files)
          e.target.value = ''
        }}
      />

      <button
        type="button"
        onClick={handlePickFiles}
        className="mb-4 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-background/60 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <Upload className="h-4 w-4" />
        本地上傳商品圖（可多選）
      </button>

      <p className="mb-2 text-xs font-medium text-muted-foreground">
        從「我的作品」選圖 · 已選 {p.layoutImages.length} 張
      </p>

      {p.candidateImages.length === 0 ? (
        <div className="mb-4 rounded-xl bg-secondary/50 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          作品裏還沒有圖片，先去
          <Link to="/model-gen" className="mx-1 font-medium text-primary hover:underline">
            AI 模特圖
          </Link>
          或
          <Link to="/scene" className="mx-1 font-medium text-primary hover:underline">
            商品場景圖
          </Link>
          生成幾張，再回來排版
        </div>
      ) : (
        <div className="mb-4 grid max-h-44 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
          {p.candidateImages.map(img => {
            const active = isSelected(img)
            return (
              <button
                key={img.imageId}
                type="button"
                onClick={() => p.handleToggleWorkImage(img)}
                className={`group relative aspect-square overflow-hidden rounded-lg border transition-all ${
                  active ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50'
                }`}
                title={img.sourceLabel}
              >
                <img src={img.url} alt={img.sourceLabel} className="h-full w-full object-cover" loading="lazy" />
                {active && (
                  <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary shadow-md">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </span>
                )}
                <span className="absolute bottom-0 left-0 right-0 truncate bg-foreground/60 px-1 py-0.5 text-xs text-background">
                  {img.sourceLabel}
                </span>
              </button>
            )
          })}
        </div>
      )}

      <div className="mt-auto">
        <p className="mb-2 text-xs font-medium text-muted-foreground">已選圖片（按詳情頁從上到下排序）</p>
        {p.layoutImages.length === 0 ? (
          <p className="rounded-xl border-2 border-dashed border-border bg-background/50 px-4 py-6 text-center text-xs text-muted-foreground">
            還沒選圖，上面點選作品圖或本地上傳即可
          </p>
        ) : (
          <ul className="space-y-2">
            {p.layoutImages.map((img, idx) => (
              <li
                key={img.imageId}
                className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2 shadow-sm"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {idx + 1}
                </span>
                <img src={img.url} alt={img.sourceLabel} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{img.sourceLabel}</span>
                <span className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => p.handleMoveImage(img.imageId, -1)}
                    disabled={idx === 0}
                    className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary disabled:pointer-events-none disabled:opacity-30"
                    title="上移"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => p.handleMoveImage(img.imageId, 1)}
                    disabled={idx === p.layoutImages.length - 1}
                    className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary disabled:pointer-events-none disabled:opacity-30"
                    title="下移"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => p.handleRemoveImage(img.imageId)}
                    className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
                    title="移除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
