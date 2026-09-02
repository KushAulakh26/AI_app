import { Users, Images } from "lucide-react"

interface AdOverviewProps {
  usersTotal: number
  worksTotal: number
}

// 數據概覽：註冊用戶總數 + 全站作品總數
export function AdOverview({ usersTotal, worksTotal }: AdOverviewProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-6 shadow-md">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
          <Users className="h-6 w-6 text-primary" aria-hidden />
        </span>
        <div>
          <p className="text-3xl font-bold leading-tight">{usersTotal}</p>
          <p className="mt-1 text-xs text-muted-foreground">註冊用戶總數</p>
        </div>
      </div>
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-6 shadow-md">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
          <Images className="h-6 w-6 text-primary" aria-hidden />
        </span>
        <div>
          <p className="text-3xl font-bold leading-tight">{worksTotal}</p>
          <p className="mt-1 text-xs text-muted-foreground">全站作品總數</p>
        </div>
      </div>
    </div>
  )
}
