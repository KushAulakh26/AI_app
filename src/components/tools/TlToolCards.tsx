import { Scissors, Sparkles, Eraser, ArrowRight } from 'lucide-react'
import type { useTools } from '@/pages/Tools/useTools'
import { TOOL_DEFS, type ToolId } from '@/pages/Tools/useTools'

const TOOL_ICONS: Record<ToolId, typeof Scissors> = {
  'remove-bg': Scissors,
  upscale: Sparkles,
  'remove-watermark': Eraser,
}

const TOOL_INDEX: Record<ToolId, string> = {
  'remove-bg': '01',
  upscale: '02',
  'remove-watermark': '03',
}

export function TlToolCards(p: ReturnType<typeof useTools>) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-md">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-lg font-bold">選一個工具</h2>
          <p className="text-xs text-muted-foreground">可用的工具都能串成流水線：處理完直接送進下一步</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {TOOL_DEFS.map(def => {
          const Icon = TOOL_ICONS[def.id]
          const active = p.activeTool === def.id
          return (
            <button
              key={def.id}
              type="button"
              onClick={() => p.handleSelectTool(def.id)}
              className={`group relative flex h-full flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all duration-200 ${
                active
                  ? 'border-primary bg-primary/10 shadow-lg ring-2 ring-primary/20'
                  : 'border-border bg-background shadow-sm hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md'
              }`}
            >
              <span className="flex w-full items-center justify-between">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                    active ? 'bg-primary text-primary-foreground shadow-md' : 'bg-secondary text-foreground'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className={`font-mono text-xs ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                  {TOOL_INDEX[def.id]}
                </span>
              </span>
              <span className="text-base font-bold">{def.label}</span>
              <span className="text-xs leading-relaxed text-muted-foreground">{def.tagline}</span>
              {def.nextTool && (
                <span className="mt-auto flex items-center gap-1 pt-1 text-xs font-medium text-primary">
                  可接流水線
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              )}
              {active && (
                <span className="absolute -top-2 right-3 rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground shadow-md">
                  使用中
                </span>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}
