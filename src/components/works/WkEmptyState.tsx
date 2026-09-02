import { Link } from 'react-router-dom'
import { FolderOpen, ImageIcon, Wand2 } from 'lucide-react'

interface WkEmptyStateProps {
  isFiltered: boolean
  onClearFilter: () => void
  onGoCreate: () => void
}

export function WkEmptyState({ isFiltered, onClearFilter, onGoCreate }: WkEmptyStateProps) {
  if (isFiltered) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-border bg-card/60 px-6 py-16 text-center shadow-sm">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <FolderOpen className="h-6 w-6 text-muted-foreground" />
        </span>
        <div>
          <p className="text-base font-semibold">這個類型下還沒有作品</p>
          <p className="mt-1 text-sm text-muted-foreground">換個類型看看，或者去生成一張新的。</p>
        </div>
        <button
          type="button"
          onClick={onClearFilter}
          className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium shadow-sm transition-all hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          查看全部作品
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-5 rounded-3xl border-2 border-dashed border-border bg-card/60 px-6 py-16 text-center shadow-sm">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-secondary shadow-md">
        <FolderOpen className="h-7 w-7 text-primary" />
      </span>
      <div>
        <p className="text-xl font-bold">作品牆還是空的</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          去生成一張 AI 模特圖或商品場景圖，做完點「保存」，作品就會自動收進這面牆。
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onGoCreate}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-md transition-all hover:scale-105 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ImageIcon className="h-4 w-4" />
          去生成模特圖
        </button>
        <Link
          to="/scene"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium shadow-sm transition-all hover:scale-105 hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Wand2 className="h-4 w-4" />
          去生成場景圖
        </Link>
      </div>
    </div>
  )
}
