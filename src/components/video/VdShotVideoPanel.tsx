import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Film, Check, Upload, Loader2, Download, RotateCw, ImageIcon } from 'lucide-react'
import type { useVideo, ShotCard } from '@/pages/Video/useVideo'

export function VdShotVideoPanel(p: ReturnType<typeof useVideo>) {
  const [stripOpenIds, setStripOpenIds] = useState<string[]>([])

  function toggleStrip(shotId: string) {
    setStripOpenIds(prev => (prev.includes(shotId) ? prev.filter(id => id !== shotId) : [...prev, shotId]))
  }

  function renderFramePicker(shot: ShotCard) {
    const frame = p.shotFrames[shot.shotId]
    const stripOpen = stripOpenIds.includes(shot.shotId) || !frame
    return (
      <div className="mt-3 rounded-xl bg-secondary/40 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-foreground">
            首幀畫面
            {frame?.status === 'done' && (
              <span className="ml-2 text-xs text-muted-foreground">來自：{frame.sourceLabel}</span>
            )}
            {frame?.status === 'uploading' && <span className="ml-2 text-xs text-muted-foreground">上傳中…</span>}
            {frame?.status === 'error' && <span className="ml-2 text-xs text-destructive">上傳失敗，重新傳一張</span>}
          </p>
          {frame && (
            <button
              type="button"
              onClick={() => toggleStrip(shot.shotId)}
              className="text-xs font-medium text-primary hover:underline"
            >
              {stripOpen ? '收起選圖' : '重新選圖'}
            </button>
          )}
        </div>

        {frame?.preview && !stripOpen && (
          <img
            src={frame.preview}
            alt={`鏡頭 ${shot.shotNo} 首幀`}
            className="h-24 w-24 rounded-lg border border-border object-cover shadow-sm"
          />
        )}

        {stripOpen && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <label className="flex h-20 w-20 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border bg-background/70 text-muted-foreground transition-colors hover:border-primary hover:text-primary">
              <Upload className="h-4 w-4" />
              <span className="text-xs">本地上傳</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  p.handleUploadFrame(shot.shotId, e.target.files?.[0] ?? null)
                  e.target.value = ''
                }}
              />
            </label>
            {p.candidateFrames.map(img => {
              const active = frame?.url === img.url && frame.status === 'done'
              return (
                <button
                  key={img.imageId}
                  type="button"
                  onClick={() => p.handlePickFrame(shot.shotId, img)}
                  className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border transition-all ${
                    active ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50'
                  }`}
                  title={img.sourceLabel}
                >
                  <img src={img.url} alt={img.sourceLabel} className="h-full w-full object-cover" loading="lazy" />
                  {active && (
                    <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                      <Check className="h-2.5 w-2.5 text-primary-foreground" />
                    </span>
                  )}
                </button>
              )
            })}
            {p.candidateFrames.length === 0 && (
              <p className="flex items-center gap-1 self-center text-xs text-muted-foreground">
                作品裏還沒有圖，去
                <Link to="/model-gen" className="font-medium text-primary hover:underline">
                  AI 模特圖
                </Link>
                或
                <Link to="/scene" className="font-medium text-primary hover:underline">
                  商品場景圖
                </Link>
                生成，或直接上傳
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  function renderResult(shot: ShotCard) {
    const slot = p.shotVideos.find(v => v.shotId === shot.shotId)
    if (!slot) return null
    if (slot.jobStatus === 'running') {
      return (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-background/70 px-4 py-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">鏡頭 {shot.shotNo} 生成中，視頻通常要幾分鐘，可先忙別的</p>
        </div>
      )
    }
    if (slot.jobStatus === 'success' && slot.videoUrl) {
      return (
        <div className="mt-3">
          <video
            controls
            src={slot.videoUrl}
            className="aspect-video w-full rounded-xl border border-border bg-foreground object-contain shadow-md"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {slot.engineName ? `引擎：${slot.engineName}` : '歷史視頻'}
              {slot.usage?.thirdPartyConsumeMoney && (
                <span className="ml-2">實付約 {slot.usage.thirdPartyConsumeMoney} 元</span>
              )}
            </span>
            <button
              type="button"
              onClick={() => p.handleDownloadVideo(slot.videoUrl as string)}
              className="flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Download className="h-3.5 w-3.5" />
              下載視頻
            </button>
          </div>
        </div>
      )
    }
    if (slot.jobStatus === 'failed') {
      return (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-destructive/10 px-4 py-3">
          <p className="text-xs text-destructive">{slot.errorText || '這個鏡頭生成失敗'}</p>
          {Object.keys(slot.body).length > 0 && (
            <button
              type="button"
              onClick={() => p.handleRetryShotVideo(shot.shotId)}
              className="flex items-center gap-1.5 rounded-full border border-destructive/40 bg-background px-4 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <RotateCw className="h-3.5 w-3.5" />
              重試
            </button>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <section className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-md">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Film className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-lg font-bold">鏡頭視頻</h2>
          <p className="text-xs text-muted-foreground">勾選關鍵鏡頭，爲每鏡選首幀畫面，批量生成短視頻片段</p>
        </div>
        <span className="ml-auto rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
          已選 {p.selectedShotIds.length} / {p.shots.length}
        </span>
      </div>

      {p.pendingFrameUrl && p.shots.length > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
          <img
            src={p.pendingFrameUrl}
            alt="作品圖首幀候選"
            className="h-12 w-12 rounded-lg border border-border object-cover"
          />
          <p className="flex-1 text-xs leading-relaxed text-foreground">
            已從「我的作品」帶入一張圖，可一鍵把它設爲全部鏡頭的首幀畫面
          </p>
          <button
            type="button"
            onClick={p.handleApplyPendingFrameToAll}
            className="shrink-0 rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            設爲全部首幀
          </button>
        </div>
      )}

      {p.needsLogin && (
        <div className="mb-3 rounded-xl bg-secondary/60 px-4 py-3 text-sm text-foreground">
          生成視頻需要先
          <Link to="/login" className="mx-1 font-bold text-primary hover:underline">
            登錄賬號
          </Link>
          ，登錄後即可繼續
        </div>
      )}

      {p.errorMsg && (
        <div className="mb-3 flex items-start justify-between gap-2 rounded-xl bg-destructive/10 px-4 py-3">
          <p className="text-xs text-destructive">{p.errorMsg}</p>
          <button type="button" onClick={() => p.setErrorMsg(null)} className="text-xs text-muted-foreground hover:text-foreground">
            關閉
          </button>
        </div>
      )}

      <ul className="space-y-3">
        {p.shots.map(shot => {
          const selected = p.selectedShotIds.includes(shot.shotId)
          return (
            <li
              key={shot.shotId}
              className={`rounded-xl border p-4 transition-all ${
                selected ? 'border-primary/60 bg-primary/5 shadow-md' : 'border-border bg-background'
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => p.handleToggleShot(shot.shotId)}
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                    selected ? 'border-primary bg-primary' : 'border-border bg-background hover:border-primary/50'
                  }`}
                  title={selected ? '取消勾選' : '勾選生成視頻'}
                >
                  {selected && <Check className="h-3 w-3 text-primary-foreground" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                    鏡頭 {shot.shotNo}
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                      {shot.duration}
                    </span>
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{shot.visual}</p>
                </div>
                {!selected && (
                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    <ImageIcon className="h-3.5 w-3.5" />
                    勾選後選首幀
                  </span>
                )}
              </div>
              {selected && renderFramePicker(shot)}
              {renderResult(shot)}
            </li>
          )
        })}
      </ul>

      {p.shotVideos.some(v => v.shotId.startsWith('resumed-')) && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">刷新前進行中的任務</p>
          {p.shotVideos
            .filter(v => v.shotId.startsWith('resumed-'))
            .map(v => (
              <div key={v.shotId} className="rounded-xl border border-border bg-background p-3">
                {v.videoUrl ? (
                  <video
                    controls
                    src={v.videoUrl}
                    className="aspect-video w-full rounded-lg border border-border bg-foreground object-contain"
                  />
                ) : (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    正在續跑之前的任務…
                  </p>
                )}
              </div>
            ))}
        </div>
      )}
    </section>
  )
}
