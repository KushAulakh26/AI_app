import { ClipboardList } from 'lucide-react'
import { VIDEO_TYPES } from '@/pages/Video/useVideo'
import type { useVideo } from '@/pages/Video/useVideo'

export function VdBriefPanel(p: ReturnType<typeof useVideo>) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-md">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ClipboardList className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-lg font-bold">商品信息</h2>
          <p className="text-xs text-muted-foreground">填得越具體，分鏡越貼你的貨</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="vd-product-name" className="mb-1.5 flex items-center gap-1 text-sm font-medium">
            商品名稱
            <span className="text-primary">*</span>
          </label>
          <input
            id="vd-product-name"
            type="text"
            value={p.productName}
            onChange={e => p.setProductName(e.target.value)}
            placeholder="例如：輕暖鵝絨羽絨服 · 冬季新款"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>

        <div>
          <label htmlFor="vd-selling-points" className="mb-1.5 flex items-center gap-1 text-sm font-medium">
            核心賣點
            <span className="text-primary">*</span>
          </label>
          <textarea
            id="vd-selling-points"
            rows={3}
            value={p.sellingPoints}
            onChange={e => p.setSellingPoints(e.target.value)}
            placeholder="例如：95 白鵝絨、輕至 380g、防潑水面料、立體修身版型"
            className="w-full resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium">
            視頻類型
            <span className="text-primary">*</span>
          </p>
          <div className="space-y-2">
            {VIDEO_TYPES.map(t => {
              const active = p.videoTypeId === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => p.setVideoTypeId(t.id)}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left transition-all duration-200 ${
                    active
                      ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/20'
                      : 'border-border bg-background hover:border-primary/50'
                  }`}
                >
                  <span>
                    <span className="block text-sm font-bold">{t.label}</span>
                    <span className="block text-xs text-muted-foreground">{t.desc}</span>
                  </span>
                  <span
                    className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                      active ? 'border-primary bg-primary' : 'border-border bg-background'
                    }`}
                  />
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label htmlFor="vd-style-note" className="mb-1.5 block text-sm font-medium">
            風格補充 <span className="text-xs text-muted-foreground">選填</span>
          </label>
          <textarea
            id="vd-style-note"
            rows={2}
            value={p.styleNote}
            onChange={e => p.setStyleNote(e.target.value)}
            placeholder="例如：日系清新、快節奏卡點、高級質感大片風"
            className="w-full resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
      </div>
    </section>
  )
}
