import { Link } from "react-router-dom"
import { ShieldCheck } from "lucide-react"
import { useIsAdmin } from "@/hooks/useIsAdmin"

// 各頁頂欄共用的管理後台入口：僅管理員名單內的登錄賬號可見。
export function AdminEntryLink() {
  const { isAdmin } = useIsAdmin()
  if (!isAdmin) return null
  return (
    <Link
      to="/admin"
      className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ShieldCheck className="h-4 w-4" aria-hidden />
      管理後台
    </Link>
  )
}
