import { Users, Images } from "lucide-react"
import type { useAdmin } from "./useAdmin"
import { AdTopBar } from "@/components/admin/AdTopBar"
import { AdGate } from "@/components/admin/AdGate"
import { AdOverview } from "@/components/admin/AdOverview"
import { AdUsersTable } from "@/components/admin/AdUsersTable"
import { AdWorksGrid } from "@/components/admin/AdWorksGrid"
import { AdConfirmDialog } from "@/components/admin/AdConfirmDialog"

export function AdminPage(p: ReturnType<typeof useAdmin>) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-secondary/60 via-background to-background">
      <div className="pointer-events-none absolute -top-32 right-0 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 top-72 h-72 w-72 rounded-full bg-secondary blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

      <AdTopBar />

      {p.gate !== "admin" ? (
        <AdGate gate={p.gate} />
      ) : (
        <main className="relative mx-auto max-w-7xl px-4 pb-24 lg:px-8">
          <section className="py-10 sm:py-14">
            <p className="font-mono text-xs font-medium uppercase tracking-widest text-primary">Admin Console</p>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
              <div>
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                  管理<span className="text-primary">後台</span>
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  掌握全站賬號與作品動態：檢視註冊用戶、巡覽所有用戶生成的作品，違規內容可直接移除。
                </p>
              </div>
            </div>
          </section>

          <section className="pb-8">
            <AdOverview usersTotal={p.usersTotal} worksTotal={p.worksTotal} />
          </section>

          <section className="pb-10">
            <div className="mb-6 flex items-center gap-2">
              <button
                type="button"
                onClick={() => p.switchTab("users")}
                className={
                  p.activeTab === "users"
                    ? "inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-transform hover:scale-105"
                    : "inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
                }
              >
                <Users className="h-4 w-4" aria-hidden />
                使用者管理
              </button>
              <button
                type="button"
                onClick={() => p.switchTab("works")}
                className={
                  p.activeTab === "works"
                    ? "inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-transform hover:scale-105"
                    : "inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
                }
              >
                <Images className="h-4 w-4" aria-hidden />
                作品管理
              </button>
            </div>

            {p.activeTab === "users" ? (
              <AdUsersTable
                rows={p.userRows}
                page={p.usersPage}
                totalPages={p.usersTotalPages}
                loading={p.usersLoading}
                onPage={p.goUsersPage}
              />
            ) : (
              <AdWorksGrid
                rows={p.workRows}
                page={p.worksPage}
                totalPages={p.worksTotalPages}
                loading={p.worksLoading}
                deletingId={p.deletingId}
                onPage={p.goWorksPage}
                onAskDelete={p.askDeleteWork}
              />
            )}
          </section>
        </main>
      )}

      <AdConfirmDialog
        work={p.pendingDeleteWork}
        busy={!!p.deletingId}
        onCancel={p.cancelDeleteWork}
        onConfirm={() => void p.confirmDeleteWork()}
      />
    </div>
  )
}
