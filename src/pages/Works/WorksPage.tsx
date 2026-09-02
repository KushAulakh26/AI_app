import type { useWorks } from './useWorks'
import { WkTopBar } from '@/components/works/WkTopBar'
import { WkFilterBar } from '@/components/works/WkFilterBar'
import { WkSyncBanner } from '@/components/works/WkSyncBanner'
import { WkWorksGrid } from '@/components/works/WkWorksGrid'
import { WkEmptyState } from '@/components/works/WkEmptyState'
import { WkDetailDialog } from '@/components/works/WkDetailDialog'
import { WkConfirmDialog } from '@/components/works/WkConfirmDialog'

export function WorksPage(p: ReturnType<typeof useWorks>) {
  const isLoading = p.pageLoadState === 'loading'
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-secondary/60 via-background to-background">
      <div className="pointer-events-none absolute -top-32 right-0 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 top-72 h-72 w-72 rounded-full bg-secondary blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

      <WkTopBar />

      <main className="relative mx-auto max-w-7xl px-4 pb-24 lg:px-8">
        <section className="py-10 sm:py-14">
          <p className="font-mono text-xs font-medium uppercase tracking-widest text-primary">My Works</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                我的<span className="text-primary">作品牆</span>
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                各個頁面攢下的模特圖、場景圖、文案、詳情頁整套和視頻，全都收在這一面牆上，點開就能看大圖、複製全文、下載或接着加工。
              </p>
            </div>
            {p.allCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="rounded-2xl border border-border bg-card px-4 py-2.5 text-center shadow-md">
                  <span className="block text-2xl font-bold text-primary">{p.allCount}</span>
                  <span className="text-xs text-muted-foreground">件作品</span>
                </span>
                <span className="rounded-2xl border border-border bg-card px-4 py-2.5 text-center shadow-md">
                  <span className="block text-2xl font-bold">{p.filterDefs.length - 1}</span>
                  <span className="text-xs text-muted-foreground">個類型</span>
                </span>
              </div>
            )}
          </div>
          <div className="mt-6">
            <WkSyncBanner
              loggedIn={!!p.account}
              syncPhase={p.syncPhase}
              unsyncedCount={p.unsyncedCount}
              noticeText={p.noticeText}
              onRetrySync={p.handleRetrySync}
              onGoLogin={p.handleGoLogin}
            />
          </div>
        </section>

        {p.allCount > 0 && (
          <section className="pb-8">
            <WkFilterBar filters={p.filterDefs} counts={p.filterCounts} active={p.activeFilter} onChange={p.handleFilterChange} />
          </section>
        )}

        <section className="pb-10">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-2xl border border-border bg-muted/60" />
              ))}
            </div>
          ) : p.visibleItems.length > 0 ? (
            <WkWorksGrid items={p.visibleItems} onOpen={p.handleOpen} />
          ) : (
            <WkEmptyState
              isFiltered={p.activeFilter !== 'all' || p.allCount > 0}
              onClearFilter={() => p.handleFilterChange('all')}
              onGoCreate={p.handleGoCreate}
            />
          )}
        </section>
      </main>

      <WkDetailDialog
        item={p.activeWork}
        copiedKey={p.copiedKey}
        onClose={p.handleCloseDetail}
        onCopyText={p.handleCopyText}
        onDownload={p.handleDownload}
        onAskDelete={p.handleAskDelete}
        onContinue={p.handleContinue}
      />
      <WkConfirmDialog item={p.pendingDelete} onCancel={p.handleCancelDelete} onConfirm={p.handleConfirmDelete} />
    </div>
  )
}
