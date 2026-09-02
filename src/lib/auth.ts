// 平臺賬號 / 登錄抽象層（auth 槽位的前端穩定契約）。
//
// aigc / llm / pb 等平臺 lib 一律從本文件取鑑權能力，**不要**直接 import 具體
// 登錄實現 —— 更換登錄提供方時只需替換本文件的綁定，其餘平臺 lib 零改動。
//
// 穩定契約（任何登錄提供方都必須實現並在此綁定）：
//   getAuthHeaders(): Record<string, string>  請求鑑權頭（未登錄返回 {}，可安全展開）
//   redirectToLogin(): void                   觸發登錄流程
//
// 頁面頂部的賬號入口組件（組件名約定以 AccountMenu 結尾）由登錄能力自帶，
// import 語句見對應登錄寫頁技能 / 安裝工具返回值，不經過本文件。
//
// 當前綁定：自建賬號註冊登錄（localAuth.ts，PocketBase users 集合）。
export {
  localAuthHeaders as getAuthHeaders,
  redirectToLocalLogin as redirectToLogin,
} from "./localAuth"
