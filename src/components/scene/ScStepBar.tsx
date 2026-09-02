import { Check } from 'lucide-react'

const STEPS = ['上傳商品圖', '自動摳圖', '選場景', '開始生成']

export function ScStepBar({ stepIndex }: { stepIndex: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-y-2">
      {STEPS.map((label, i) => {
        const done = i < stepIndex
        const active = i === stepIndex
        return (
          <li key={label} className="flex items-center">
            <span
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
                active
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : done
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                  active ? 'bg-primary-foreground/20' : done ? 'bg-primary/15' : 'bg-background'
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="mx-2 h-px w-5 bg-border" />}
          </li>
        )
      })}
    </ol>
  )
}
