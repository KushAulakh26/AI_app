import { useRef } from 'react'
import { UploadCloud, ImagePlus, RotateCcw, Loader2, FolderOpen } from 'lucide-react'
import type { useTools } from '@/pages/Tools/useTools'

export function TlUploadPanel(p: ReturnType<typeof useTools>) {
  const fileRef = useRef<HTMLInputElement>(null)
  const pickerWorks = p.sidebarWorks.slice(0, 8)

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-md">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ImagePlus className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-lg font-bold">放上要處理的圖</h2>
            <p className="text-xs text-muted-foreground">本地上傳，或直接從我的作品裏挑一張</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => p.setWorksPickerOpen(!p.worksPickerOpen)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
              p.worksPickerOpen
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-background text-foreground hover:border-primary hover:text-primary'
            }`}
          >
            <FolderOpen className="h-3.5 w-3.5" />
            從作品選圖
          </button>
          {p.imageUrlsPreview && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              重新上傳
            </button>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault()
          p.handleImageUrlsChange(e.dataTransfer.files?.[0] ?? null)
        }}
        className="group relative flex min-h-56 w-full flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-background/60 p-4 transition-colors hover:border-primary"
      >
        {p.imageUrlsPreview ? (
          <img src={p.imageUrlsPreview} alt="待處理圖片預覽" className="max-h-64 w-full rounded-lg object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary transition-transform group-hover:scale-105">
              <UploadCloud className="h-7 w-7 text-primary" />
            </span>
            <p className="text-sm font-medium">拖拽或點擊上傳圖片</p>
            <p className="text-xs">支持 JPG / PNG / WEBP，一次處理一張</p>
          </div>
        )}
        {p.imageUrlsStatus === 'uploading' && (
          <span className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </span>
        )}
        {p.imageUrlsStatus === 'error' && (
          <span className="absolute inset-x-0 bottom-0 bg-destructive/10 py-1.5 text-center text-xs text-destructive">
            上傳失敗，請重試
          </span>
        )}
        {p.imageUrlsStatus === 'done' && (
          <span className="absolute left-2 top-2 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            圖片已就緒
          </span>
        )}
      </button>

      {p.worksPickerOpen && (
        <div className="mt-4 rounded-xl border border-border bg-muted/60 p-4">
          <p className="mb-3 text-sm font-medium text-muted-foreground">從我的作品裏選一張作爲輸入</p>
          {pickerWorks.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">作品庫還是空的，先去其他頁面生成幾張圖吧</p>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
              {pickerWorks.map(w => (
                <button
                  key={w.key}
                  type="button"
                  onClick={() => p.handlePickWork(w.url)}
                  title={w.modeLabel}
                  className="overflow-hidden rounded-lg border border-border bg-background transition-all hover:scale-105 hover:border-primary hover:shadow-md"
                >
                  <img src={w.url} alt={w.modeLabel} className="h-16 w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={e => p.handleImageUrlsChange(e.target.files?.[0] ?? null)}
      />
    </section>
  )
}
