import { Image as ImageIcon, Sparkles } from "lucide-react"
import type { CaseItem } from "@/pages/Home/useHome"
import sampleFace from "@/assets/sample-face.jpg"

interface CaseWallProps {
  cases: CaseItem[]
}

/** 按案例類型渲染精緻的成品示意圖（接入真實出圖前的演示表現） */
function CaseMock({ kind }: { kind: string }) {
  if (kind === "場景圖") {
    // 香薰蠟燭 · 暖光桌面
    return (
      <div className="absolute inset-0" aria-hidden>
        <div className="absolute left-1/2 top-5 h-16 w-16 -translate-x-1/2 rounded-full bg-card/40 blur-xl" />
        <div className="absolute left-8 top-10 h-2 w-2 rounded-full bg-card/40" />
        <div className="absolute right-9 top-16 h-1.5 w-1.5 rounded-full bg-card/30" />
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 flex-col items-center">
          <div className="h-1.5 w-1.5 rounded-full bg-card shadow-sm" />
          <div className="h-1.5 w-0.5 bg-card/70" />
          <div className="h-10 w-8 rounded-md bg-card/90 shadow-md" />
        </div>
        <div className="absolute bottom-7 left-4 right-4 h-1 rounded-full bg-card/40" />
        <div className="absolute bottom-3 left-1/2 h-2 w-24 -translate-x-1/2 rounded-full bg-foreground/15 blur-sm" />
      </div>
    )
  }
  if (kind === "模特圖") {
    // 針織開衫 · 街景通勤
    return (
      <div className="absolute inset-0" aria-hidden>
        <div className="absolute left-7 top-8 h-2 w-2 rounded-full bg-card/50" />
        <div className="absolute right-8 top-14 h-1.5 w-1.5 rounded-full bg-card/40" />
        <div className="absolute right-6 bottom-16 h-2 w-2 rounded-full bg-card/30" />
        <div className="absolute inset-0 flex items-end justify-center pb-6">
          <div className="relative flex flex-col items-center">
            <div className="h-7 w-7 rounded-full bg-card shadow-md" />
            <div className="mt-1 h-9 w-[52px] rounded-t-[1.4rem] bg-card/95 shadow-sm" />
            <div className="h-11 w-10 bg-card/85 [clip-path:polygon(0_0,100%_0,78%_100%,22%_100%)]" />
            <div className="absolute -bottom-2 left-1/2 h-1.5 w-20 -translate-x-1/2 rounded-full bg-foreground/20 blur-sm" />
          </div>
        </div>
      </div>
    )
  }
  if (kind === "詳情頁") {
    // 保溫杯 · 賣點長圖
    return (
      <div className="absolute inset-0" aria-hidden>
        <div className="absolute left-1/2 top-1/2 w-24 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-card/90 p-2 shadow-md">
          <div className="h-12 rounded bg-gradient-to-br from-primary/60 to-accent/70" />
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-border" />
          <div className="mt-1 h-1.5 w-3/4 rounded-full bg-border" />
          <div className="mt-1.5 grid grid-cols-2 gap-1">
            <div className="h-6 rounded bg-muted" />
            <div className="h-6 rounded bg-muted" />
          </div>
          <div className="mt-1 h-1.5 w-1/2 rounded-full bg-border" />
        </div>
      </div>
    )
  }
  if (kind === "去背景") {
    // 帆布鞋 · 透明底摳圖（棋盤格 + 商品剪影）
    return (
      <div className="absolute inset-0" aria-hidden>
        <div className="absolute inset-0 grid grid-cols-6 grid-rows-6">
          {Array.from({ length: 36 }).map((_, i) => (
            <div key={i} className={(Math.floor(i / 6) + i) % 2 === 0 ? "bg-card/25" : "bg-muted/40"} />
          ))}
        </div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="h-10 w-20 rounded-[50%_50%_45%_45%/60%_60%_40%_40%] bg-card shadow-md" />
          <div className="mx-auto mt-1 h-2 w-16 rounded-full bg-foreground/20 blur-sm" />
        </div>
        <Sparkles className="absolute right-3 bottom-3 h-3.5 w-3.5 text-card/90" aria-hidden />
      </div>
    )
  }
  if (kind === "高清修復") {
    // 左模糊右清晰的對比小樣
    return (
      <div className="absolute inset-0" aria-hidden>
        <div className="absolute left-1/2 top-1/2 flex h-28 w-24 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border border-card/60 bg-card/80 shadow-md">
          <div className="flex w-1/2 flex-col items-center justify-center gap-1.5 blur-[2px]">
            <div className="h-6 w-6 rounded-full bg-primary/60" />
            <div className="h-1.5 w-8 rounded-full bg-border" />
            <div className="h-1.5 w-6 rounded-full bg-border" />
          </div>
          <div className="flex w-1/2 flex-col items-center justify-center gap-1.5">
            <div className="h-6 w-6 rounded-full bg-primary shadow-sm" />
            <div className="h-1.5 w-8 rounded-full bg-foreground/50" />
            <div className="h-1.5 w-6 rounded-full bg-foreground/40" />
          </div>
        </div>
        <div className="absolute left-1/2 top-1/2 h-28 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-card" />
      </div>
    )
  }
  if (kind === "營銷文案") {
    // 種草筆記卡：標題 + 正文行 + 互動條
    return (
      <div className="absolute inset-0" aria-hidden>
        <div className="absolute left-1/2 top-1/2 w-28 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-card/90 p-2.5 shadow-md">
          <div className="h-2 w-3/4 rounded-full bg-primary/70" />
          <div className="mt-2 h-1.5 w-full rounded-full bg-border" />
          <div className="mt-1 h-1.5 w-full rounded-full bg-border" />
          <div className="mt-1 h-1.5 w-2/3 rounded-full bg-border" />
          <div className="mt-2 flex items-center gap-1">
            <div className="h-2.5 w-2.5 rounded-full bg-primary/80" />
            <div className="h-1.5 w-8 rounded-full bg-border" />
            <div className="ml-auto h-1.5 w-5 rounded-full bg-accent" />
          </div>
        </div>
      </div>
    )
  }
  if (kind === "分鏡腳本") {
    // 三格分鏡條
    return (
      <div className="absolute inset-0" aria-hidden>
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-1.5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="relative h-20 w-14 overflow-hidden rounded-md border border-card/60 bg-card/85 shadow-sm">
              <div className="absolute inset-x-1 top-1 h-8 rounded bg-gradient-to-br from-primary/50 to-accent/60" />
              <div className="absolute inset-x-1 top-11 h-1 rounded-full bg-border" />
              <div className="absolute inset-x-1 top-[52px] h-1 w-2/3 rounded-full bg-border" />
              <span className="absolute bottom-0.5 right-1 text-[9px] font-bold text-muted-foreground">
                {`0${n}`}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  // 短視頻 · 手機豎屏口播
  return (
    <div className="absolute inset-0" aria-hidden>
      <div className="absolute left-1/2 top-1/2 h-28 w-16 -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-card/70 bg-foreground/25 p-1.5 shadow-md">
        <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg bg-card/25">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-card/90 shadow-sm">
            <div className="ml-0.5 h-0 w-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-primary" />
          </div>
          <div className="h-1 w-9 rounded-full bg-card/80" />
          <div className="h-1 w-6 rounded-full bg-card/60" />
        </div>
      </div>
    </div>
  )
}

export function CaseWall({ cases }: CaseWallProps) {
  return (
    <section id="cases" className="bg-accent/60 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-primary">
              Showcase · 案例效果
            </p>
            <h2 className="mt-3 text-2xl font-bold leading-tight text-foreground md:text-3xl">
              出片效果，先睹爲快
            </h2>
          </div>
          <p className="max-w-md text-base text-muted-foreground">
            下面是內置示例效果，進入功能頁上傳你自己的商品圖，就能生成同款成片。
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {/* 前後對比卡：原圖小樣 + 生成示意 */}
          <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-md transition-all hover:-translate-y-1 hover:shadow-lg">
            <div className="grid flex-1 grid-cols-2 gap-3">
              <div className="flex flex-col items-center justify-center rounded-xl bg-muted p-3">
                <img
                  src={sampleFace}
                  alt="原圖示例"
                  className="h-16 w-16 rounded-lg border border-border object-cover shadow-sm"
                />
                <span className="mt-2 text-xs text-muted-foreground">原圖</span>
              </div>
              <div className="relative flex flex-col items-center justify-end overflow-hidden rounded-xl bg-gradient-to-br from-primary via-secondary to-accent p-3">
                {/* 聚光 + 光斑 */}
                <div
                  className="absolute left-1/2 top-0 h-2/3 w-full -translate-x-1/2 rounded-full bg-card/20 blur-2xl"
                  aria-hidden
                />
                <div className="absolute left-3 top-4 h-1.5 w-1.5 rounded-full bg-card/50" aria-hidden />
                <div className="absolute right-4 top-8 h-1 w-1 rounded-full bg-card/40" aria-hidden />
                <Sparkles
                  className="absolute right-2 top-2 h-3 w-3 text-primary-foreground/80"
                  aria-hidden
                />
                {/* 模特剪影小樣 */}
                <div className="relative mb-3 flex flex-col items-center">
                  <div className="h-6 w-6 rounded-full bg-card shadow-md" />
                  <div className="mt-0.5 h-8 w-11 rounded-t-[1.1rem] bg-card/95 shadow-sm" />
                  <div className="h-8 w-9 bg-card/85 [clip-path:polygon(0_0,100%_0,78%_100%,22%_100%)]" />
                  <div
                    className="absolute -bottom-1.5 left-1/2 h-1.5 w-16 -translate-x-1/2 rounded-full bg-foreground/20 blur-sm"
                    aria-hidden
                  />
                </div>
                <span className="text-xs font-semibold text-primary-foreground">
                  生成後
                </span>
              </div>
            </div>
            <h3 className="mt-4 text-sm font-bold text-foreground">真人模特 · 上身效果</h3>
            <p className="mt-1 text-xs text-muted-foreground">一張原圖出模特展示圖</p>
          </article>

          {cases.map((item) => (
            <article
              key={item.key}
              className={`flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-md transition-all hover:rotate-0 hover:-translate-y-1 hover:shadow-lg ${
                item.rotate ?? ""
              }`}
            >
              <div
                className={`relative min-h-40 flex-1 overflow-hidden rounded-xl bg-gradient-to-br ${item.gradient}`}
              >
                <CaseMock kind={item.kind} />
                <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-card/90 px-2.5 py-1 text-xs font-semibold text-card-foreground shadow-sm">
                  <ImageIcon className="h-3 w-3 text-primary" aria-hidden />
                  {item.kind}
                </span>
              </div>
              <h3 className="mt-4 text-sm font-bold text-foreground">{item.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>
            </article>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          示例素材僅用於演示效果 · 進入任一功能頁即可生成屬於你的成片
        </p>
      </div>
    </section>
  )
}
