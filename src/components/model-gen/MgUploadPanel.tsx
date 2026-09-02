import { useRef } from 'react'
import { UploadCloud, Scissors, RotateCcw, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import type { useModelGen } from '@/pages/ModelGen/useModelGen'

export function MgUploadPanel(p: ReturnType<typeof useModelGen>) {
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-md">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Scissors className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-lg font-bold">上傳商品圖，自動摳出服裝</h2>
            <p className="text-xs text-muted-foreground">支持 JPG / PNG，上傳後自動去背景輸出透明底</p>
          </div>
        </div>
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

      <div className="grid gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="group relative flex min-h-56 flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-background/60 p-4 transition-colors hover:border-primary"
        >
          {p.imageUrlsPreview ? (
            <img src={p.imageUrlsPreview} alt="商品圖預覽" className="max-h-64 w-full rounded-lg object-contain" />
          ) : (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary transition-transform group-hover:scale-105">
                <UploadCloud className="h-7 w-7 text-primary" />
              </span>
              <p className="text-sm font-medium">拖拽或點擊上傳商品圖</p>
              <p className="text-xs">建議平鋪或掛拍的服裝圖，效果更佳</p>
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
        </button>

        <div className="flex min-h-56 flex-col rounded-xl border border-border bg-muted/60 p-4">
          <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Scissors className="h-4 w-4 text-primary" />
            透明底服裝預覽
          </p>
          {p.cutoutJobStatus === 'cutting' && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">正在摳出服裝，約需 30–90 秒…</p>
            </div>
          )}
          {p.cutoutJobStatus === 'done' && p.cutoutUrl && (
            <div className="relative flex-1">
              <img src={p.cutoutUrl} alt="摳圖結果" className="max-h-56 w-full rounded-lg object-contain" />
              <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                <CheckCircle2 className="h-3.5 w-3.5" />
                摳圖完成
              </span>
            </div>
          )}
          {p.cutoutJobStatus === 'failed' && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="max-w-60 text-center text-sm text-destructive">{p.cutoutError || '摳圖失敗'}</p>
              <button
                type="button"
                onClick={p.handleRetryCutout}
                className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-md transition-transform hover:scale-105"
              >
                重試摳圖
              </button>
            </div>
          )}
          {p.cutoutJobStatus === 'idle' && (
            <div className="flex flex-1 items-center justify-center text-center text-sm text-muted-foreground">
              {p.imageUrlsStatus === 'done' ? '準備開始摳圖…' : '上傳商品圖後，這裏會展示摳好的透明底服裝'}
            </div>
          )}
        </div>
      </div>

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
