import type { WorkFilter, WorkFilterDef } from '@/pages/Works/useWorks'

interface WkFilterBarProps {
  filters: WorkFilterDef[]
  counts: Record<WorkFilter, number>
  active: WorkFilter
  onChange: (next: WorkFilter) => void
}

export function WkFilterBar({ filters, counts, active, onChange }: WkFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((f) => {
        const isActive = f.id === active
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onChange(f.id)}
            className={
              isActive
                ? 'inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-md transition-all hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                : 'inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:text-foreground hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
            }
          >
            {f.label}
            <span
              className={
                isActive
                  ? 'rounded-full bg-primary-foreground/20 px-1.5 text-xs font-semibold'
                  : 'rounded-full bg-muted px-1.5 text-xs font-semibold'
              }
            >
              {counts[f.id]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
