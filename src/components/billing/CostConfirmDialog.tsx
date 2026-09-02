// Canonical page-in-page billing confirm dialog. Pair with `useCostConfirm()`
// (src/hooks/useCostConfirm.ts) — do not build a separate dialog and do not fall back
// to `window.confirm`/`alert`/`prompt` for billing confirmation, see
// billing contract. Rendering is entirely local (fixed overlay), no portal
// dependency required.
import { Wallet } from "lucide-react"
import type { UseCostConfirmResult } from "@/hooks/useCostConfirm"

type CostConfirmDialogProps = Pick<
  UseCostConfirmResult,
  "costConfirmOpen" | "costConfirmPriceText" | "dontShowToday" | "setDontShowToday" | "confirmCostAction" | "cancelCostConfirm"
> & {
  title?: string
}

export function CostConfirmDialog({
  costConfirmOpen,
  costConfirmPriceText,
  dontShowToday,
  setDontShowToday,
  confirmCostAction,
  cancelCostConfirm,
  title = "確認運行",
}: CostConfirmDialogProps) {
  if (!costConfirmOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onClick={cancelCostConfirm}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-border bg-card p-5 text-card-foreground shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold">{title}</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">{"\n          將調用 AI 服務，可能消耗帳戶餘額。\n          "}{costConfirmPriceText ? ` ${costConfirmPriceText}。` : ""}
        </p>
        <label className="mb-4 flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={dontShowToday}
            onChange={(e) => setDontShowToday(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />{"\n          今天內不再提醒（僅對當前項目有效）\n        "}</label>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={cancelCostConfirm}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted"
          >{"\n            取消\n          "}</button>
          <button
            type="button"
            onClick={confirmCostAction}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm hover:scale-105"
          >{"\n            確認運行\n          "}</button>
        </div>
      </div>
    </div>
  )
}
