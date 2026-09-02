// 自建賬號登錄實現（auth 槽位提供方）。賬號存應用自己的 PocketBase `users`
// 認證集合，註冊/登錄/會話/重置密碼全部走 `./pb` 的 __pb 代理，無外部賬號體係依赖。
//
// 會話由 PocketBase SDK 的 authStore 管理（localStorage 持久化 + 自動攜帶
// Authorization），業務代碼禁止自己存取 token。
//
// 注意：只在函數體內使用 pb（pb.ts ← auth.ts ← 本文件 存在模塊環，模塊頂層
// 取 pb 會拿到未初始化的綁定）。

import { pb, getBasename } from "./pb"

export interface LocalAccount {
  id: string
  email: string
  name: string
  avatarUrl?: string
}

function toAccount(record: Record<string, unknown> | null): LocalAccount | null {
  if (!record || typeof record.id !== "string") return null
  return {
    id: record.id,
    email: typeof record.email === "string" ? record.email : "",
    name: typeof record.name === "string" && record.name ? record.name : String(record.email ?? ""),
    avatarUrl: typeof record.avatar === "string" && record.avatar
      ? pb.files.getURL(record as { [k: string]: unknown; id: string; collectionId?: string }, record.avatar as string)
      : undefined,
  }
}

export function getLocalAccount(): LocalAccount | null {
  return pb.authStore.isValid ? toAccount(pb.authStore.record as Record<string, unknown> | null) : null
}

// 訂閱登錄態變化（含跨標籤頁）；返回取消訂閱函數。fireImmediately=true 會先回調當前態。
export function onLocalAccountChange(
  cb: (account: LocalAccount | null) => void,
  fireImmediately = true,
): () => void {
  return pb.authStore.onChange(() => cb(getLocalAccount()), fireImmediately)
}

// 註冊並自動登錄。PocketBase 默認密碼 ≥8 位；email 重複等錯誤會 throw，
// 調用方須轉成產品語提示（不要把原始報錯拋給用戶）。
export async function registerLocalAccount(
  email: string,
  password: string,
  name?: string,
): Promise<LocalAccount> {
  await pb.collection("users").create({
    email,
    password,
    passwordConfirm: password,
    ...(name ? { name } : {}),
  })
  return loginLocalAccount(email, password)
}

export async function loginLocalAccount(email: string, password: string): Promise<LocalAccount> {
  await pb.collection("users").authWithPassword(email, password)
  const account = getLocalAccount()
  if (!account) throw new Error("login succeeded but auth store is empty")
  return account
}

export function logoutLocalAccount(): void {
  pb.authStore.clear()
}

// 重置密碼：PocketBase 會發送重置邮件（需配置 SMTP）。前端只需提供邮箱，
// 用戶點擊邮件連結後在重置頁提交新密碼。
export async function requestPasswordReset(email: string): Promise<void> {
  await pb.collection("users").requestPasswordReset(email.trim())
}

export async function confirmPasswordReset(
  token: string,
  newPassword: string,
): Promise<LocalAccount> {
  await pb.collection("users").confirmPasswordReset(token, newPassword, newPassword)
  // PB 不會自動登錄，需要用新密碼登錄
  return getLocalAccount() ?? (await loginLocalAccount(
    (pb.authStore.record as Record<string, unknown> | null)?.email as string ?? "",
    newPassword,
  ))
}

// 跳應用自己的登錄頁（/login 路由由寫頁技能負責創建）。
// 用 getBasename 拼前綴：AccountMenu 在 Router 外也能安全調用。
export function redirectToLocalLogin(): void {
  const base = getBasename()
  window.location.assign(`${base === "/" ? "" : base}/login`)
}

// auth.ts 穩定契約的綁定來源：未登錄返回 {}，可安全展開進任意 headers。
// PocketBase SDK 自身請求會自動帶 authStore token，這裡主要供平臺 lib 的
// 裸 fetch（/api/aigc、/api/llm 等服務端路由按此識別當前用戶）。
export function localAuthHeaders(): Record<string, string> {
  return pb.authStore.isValid && pb.authStore.token
    ? { Authorization: pb.authStore.token }
    : {}
}

// 使用者 id，用於資料範圍指定。
export function getCurrentUserId(): string | null {
  return pb.authStore.isValid ? (pb.authStore.record?.id as string | undefined) ?? null : null
}
