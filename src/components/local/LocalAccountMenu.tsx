// 自建賬號入口組件。頁面頂部 chrome 裏 <LocalAccountMenu /> 即可，無 props，
// 自管登錄/退出狀態；需要按登錄態渲染其他內容時傳 onAccountChange 回調。
//
// 未登錄 → 「登錄 / 註冊」按鈕跳應用自己的 /login 頁（頁面由寫頁技能創建）；
// 已登錄 → 頭像首字母 + 暱稱 + 退出。

import { useEffect, useRef, useState } from "react"
import {
  getLocalAccount,
  logoutLocalAccount,
  onLocalAccountChange,
  redirectToLocalLogin,
  type LocalAccount,
} from "@/lib/localAuth"

export interface LocalAccountMenuProps {
  onAccountChange?: (account: LocalAccount | null) => void
}

export function LocalAccountMenu({ onAccountChange }: LocalAccountMenuProps) {
  const [account, setAccount] = useState<LocalAccount | null>(() => getLocalAccount())

  // onAccountChange 常是父組件每次渲染都新建的 inline 回調。用 ref 存最新引用,
  // 訂閱只在掛載時建立一次 —— 否則 "不穩定回調進 effect 依賴 + onChange
  // fireImmediately 立刻回調" 會反覆重訂閱→setState→重渲染→再重訂閱, 觸發
  // React "Maximum update depth exceeded"(整頁黑屏)。切勿把 onAccountChange
  // 放進下面訂閱 effect 的依賴數組。
  const onAccountChangeRef = useRef(onAccountChange)
  useEffect(() => {
    onAccountChangeRef.current = onAccountChange
  })

  useEffect(() => {
    return onLocalAccountChange((next) => {
      setAccount(next)
      onAccountChangeRef.current?.(next)
    })
  }, [])

  if (!account) {
    return (
      <button
        type="button"
        onClick={() => redirectToLocalLogin()}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        登錄 / 註冊
      </button>
    )
  }

  return (
    <div className="inline-flex items-center gap-2">
      {account.avatarUrl ? (
        <img src={account.avatarUrl} alt={account.name} className="h-7 w-7 rounded-full object-cover" />
      ) : (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium">
          {(account.name || account.email).slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="max-w-[10rem] truncate text-sm text-muted-foreground">
        {account.name || account.email}
      </span>
      <button
        type="button"
        onClick={() => logoutLocalAccount()}
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        退出
      </button>
    </div>
  )
}
