import { useState } from 'react'
import { BadgeCheck, RotateCcw } from 'lucide-react'

interface StBillingNoteProps {
  onReset: () => void
}

export function StBillingNote({ onReset }: StBillingNoteProps) {
  const [armed, setArmed] = useState(false)

  function handleResetClick() {
    if (!armed) {
      setArmed(true)
      setTimeout(() => setArmed(false), 3000)
      return
    }
    setArmed(false)
    onReset()
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[3fr_2fr]">
      <div className="rounded-2xl border border-dashed border-border bg-secondary/50 p-5">
        <div className="mb-3 flex items-center gap-2">
          <BadgeCheck className="h-5 w-5 text-primary" aria-hidden />
          <h2 className="text-base font-bold">計費怎麼算</h2>
        </div>
        <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
          <li>· 生圖、生視頻按次計費，按實際用量扣費</li>
          <li>· 寫作按實際用量計費</li>
          <li>· 每次生成前都會彈出確認，確認後纔會扣費</li>
        </ul>
      </div>

      <div className="flex h-full flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-md">
        <div>
          <h2 className="text-base font-bold">恢復出廠設置</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            全部引擎恢復啓用，各組默認引擎回到出廠配置
          </p>
        </div>
        <button
          type="button"
          onClick={handleResetClick}
          className={`mt-4 flex items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            armed
              ? 'border-destructive bg-destructive text-destructive-foreground hover:scale-105'
              : 'border-border bg-background text-foreground hover:border-primary hover:text-primary'
          }`}
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          {armed ? '再點一次確認恢復' : '恢復默認設置'}
        </button>
      </div>
    </section>
  )
}
