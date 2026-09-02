import PocketBase, { LocalAuthStore } from "pocketbase"


// 後端固定掛在 /__pb（dev 由 Vite 代理，部署時由反向代理轉發），
// 前端不需要知道 PocketBase 實際跑在哪個埠。
export function getPocketBaseUrl(): string {
  return "/__pb"
}

// 應用掛在網域根目錄，React Router 不需要額外前綴。
export function getBasename(): string {
  return "/"
}

// 登錄態存 localStorage，鍵名固定。
const AUTH_STORE_KEY = "pb_auth"

export const pb = new PocketBase(getPocketBaseUrl(), new LocalAuthStore(AUTH_STORE_KEY))

pb.authStore.onChange(() => {
  // hook for UI updates; 業務代碼按需訂閱
}, true)
