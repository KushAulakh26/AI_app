# 零壹電商寶 · 01X-AI Studio

上傳商品圖，一站式生成電商內容：AI 模特圖、商品場景圖、賣點文案、詳情頁整套、短視頻。

前端 React 19 + TypeScript + Vite，後端 PocketBase（含自定義 JSVM 路由），
生成能力接第三方 AI 供應商。賬號、作品、生成歷史全部存在自己的資料庫裡。

---

## 功能

| 模塊 | 路由 | 說明 |
| --- | --- | --- |
| AI 模特圖 | `/model-gen` | 上傳商品圖，生成模特上身圖 |
| 商品場景圖 | `/scene` | 商品放進不同拍攝場景 |
| 賣點文案 | `/copywriting` | 按平台風格併發出稿 |
| 詳情頁整套 | `/detail` | 主圖標題／賣點／規格／描述四塊併發生成 |
| 短視頻 | `/video` | 分鏡腳本 → 逐鏡首幀 → 生成視頻 |
| 圖片工具 | `/tools` | 摳圖等單圖處理，可接流水線 |
| 我的作品 | `/works` | 全部產出匯總，跟着賬號走 |

## 賬號體係

自有郵箱 / 密碼賬號，存在本專案自己的 PocketBase `users` 集合：

- 註冊、登錄、登出、忘記密碼、重置密碼
- 每個賬號只能讀寫自己的作品；跨賬號請求一律回 404
- 作品歸屬由服務端從登錄態推導，客戶端傳來的 `user_id` 一律忽略
- 生成歷史存雲端，換瀏覽器 / 清空快取後仍在

## 本地運行

需要 Node 20+ 和 Windows PowerShell。

1. 複製環境變數範本並填入供應商金鑰：

   ```bash
   cp .env.example .env.local
   ```

   必填：

   | 變數 | 用途 |
   | --- | --- |
   | `AI_PROVIDER_BASE_URL` | 供應商 API 位址 |
   | `AI_PROVIDER_API_KEY` | 圖片 / 視頻生成金鑰 |
   | `AI_PROVIDER_LLM_API_KEY` | 文案 / 腳本的 LLM 金鑰 |
   | `PUBLIC_ASSET_BASE_URL` | 供應商回來取圖的公網位址（見下） |

   `.env.local` 已被 `.gitignore` 排除，金鑰不會進版本庫。

2. 啟動（同時起 PocketBase :7000 和 Vite :8000）：

   ```bash
   ./start.bat
   ```

   打開 http://127.0.0.1:8000

### 關於 `PUBLIC_ASSET_BASE_URL`

供應商只接受**公網可取**的圖片 URL，不能直接收本機檔案。所以上傳的商品圖
必須有一個外網打得開的位址。本地開發用 cloudflared 快速隧道：

```bash
cloudflared tunnel --url http://127.0.0.1:7000
```

把輸出的 `https://xxx.trycloudflare.com` 填進 `PUBLIC_ASSET_BASE_URL`
（結尾**不要**加 `/__pb`，隧道直接指向 PocketBase）。

快速隧道每次重啟都會換網域，過期後生成會報 `no such host` —— 換一條隧道
並更新這個變數即可。

## 架構

```
瀏覽器 ──► Vite :8000 ──/__pb 代理──► PocketBase :7000 ──► AI 供應商
                                          │
                                          └─► pb_data（賬號 / 作品 / 生成結果）
```

- **前端不直接碰供應商**：所有生成請求走自己的後端，金鑰只存在服務端。
- **結果落地**：供應商回傳的 URL 有時效，後端會把成品下載並存進 PocketBase，
  作品頁引用的是自己網域下的永久位址，不會過期失效。
- **`pb_hooks` 注意事項**：每個 `routerAdd` 處理器是獨立作用域，看不到檔案頂層
  的變數和函數；共用邏輯要在處理器內部 `require()` 進來。

### 目錄

```
src/
  pages/          每個功能一個資料夾：Page.tsx（純渲染）+ useX.ts（狀態邏輯）
  components/     UI 元件，按功能分組
  lib/            pb.ts（PocketBase 客戶端）、localAuth.ts（賬號）、
                  aigc.ts（生成）、llm.ts（文案）、localWorks.ts（作品快取）
pocketbase/
  pb_hooks/       後端自定義路由（JSVM）
  pb_data/        本機資料庫，未進版本庫
```

## 開發

```bash
npm install
npm run build      # tsc -b && vite build
npm run lint
```
