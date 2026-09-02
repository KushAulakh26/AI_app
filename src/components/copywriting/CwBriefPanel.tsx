import { ClipboardList } from 'lucide-react'
import type { useCopywriting } from '@/pages/Copywriting/useCopywriting'

export function CwBriefPanel(p: ReturnType<typeof useCopywriting>) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-md">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ClipboardList className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-lg font-bold">商品信息</h2>
          <p className="text-xs text-muted-foreground">填得越具體，文案越貼你的貨</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="cw-product-name" className="mb-1.5 flex items-center gap-1 text-sm font-medium">
            商品名稱
            <span className="text-primary">*</span>
          </label>
          <input
            id="cw-product-name"
            type="text"
            value={p.productName}
            onChange={e => p.setProductName(e.target.value)}
            placeholder="例如：輕暖鵝絨羽絨服 · 冬季新款"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>

        <div>
          <label htmlFor="cw-selling-points" className="mb-1.5 flex items-center gap-1 text-sm font-medium">
            核心賣點
            <span className="text-primary">*</span>
          </label>
          <textarea
            id="cw-selling-points"
            rows={3}
            value={p.sellingPoints}
            onChange={e => p.setSellingPoints(e.target.value)}
            placeholder="例如：95 白鵝絨、輕至 380g、防潑水面料、立體修身版型"
            className="w-full resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="cw-audience" className="mb-1.5 block text-sm font-medium">
              目標人羣 <span className="text-xs text-muted-foreground">選填</span>
            </label>
            <input
              id="cw-audience"
              type="text"
              value={p.audience}
              onChange={e => p.setAudience(e.target.value)}
              placeholder="例如：25-35 歲通勤上班族"
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="cw-promo" className="mb-1.5 block text-sm font-medium">
              促銷信息 <span className="text-xs text-muted-foreground">選填</span>
            </label>
            <input
              id="cw-promo"
              type="text"
              value={p.promo}
              onChange={e => p.setPromo(e.target.value)}
              placeholder="例如：雙 12 立減 200、前 100 名贈圍巾"
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
