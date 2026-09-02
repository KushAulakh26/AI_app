# Full E-Commerce Platform Compliance Audit

**Repository:** `C:\Users\kushd\Downloads\dianshangbao-canonical`
**Product:** 01X AI E-Commerce Platform (零壹電商寶)
**Audit date:** 2026-09-02
**Scope:** Full-stack audit — frontend, PocketBase hooks/API routes, database, auth, AI provider layer, and build pipeline.
**Constraint:** Audit only — no files modified.

---

## Methodology

- Repository mapping (all 1515 files).
- Case-insensitive + indirect RunningHub search across all source, config, docs, hooks, and comments.
- Auth flow review (register → login → session → logout → password reset).
- IDOR / ownership review: every write path, read query, and delete operation checked for `user_id` sourcing from the authenticated session vs. client-supplied values.
- AI provider abstraction review: provider config, hardcoded base URLs/models, and provider-specific logic isolation.
- PocketBase collection + hook review: ownership fields, rules, relations, and migration patterns.
- End-to-end walkthrough of every feature: UI → frontend hook → fetch/API route → hook handler → auth → provider call → DB/storage → persistence → UI result.
- Build (`npm run build`), lint (`npx eslint "src/**/*"`), and type check (`npx tsc --noEmit`) executed.

---

## 1. The e-commerce platform must be genuinely usable

### Status: PARTIAL

The platform has 12 routes and every major feature is wired end-to-end with real fetch calls, real PocketBase routes, and real AI provider calls. However, several features rely on **local-only works** (no persistence for unauthenticated users), and some edge-case handling is incomplete.

### Findings

| # | Requirement | Severity | File | Location | Finding | Evidence | Why it matters | Required fix |
|---|-------------|----------|------|----------|---------|----------|----------------|--------------|
| 1 | Feature connectivity: ModelGen | High | `src/pages/ModelGen/useModelGen.ts` | `useModelGen` (full) | Model generation (seedream-4.5-white) flows: upload → cutout → callAigcAndPoll → poll → persist to localWorks. Fully wired. | Real `callAigcAndPoll`, real `uploadAigcMedia`, `appendLocalWork`. | Core feature works. | None. |
| 2 | Feature connectivity: Scene | High | `src/pages/Scene/useScene.ts` | `useScene` (full) | Scene generation: upload → template → callAigcAndPoll → persist. Fully wired. | `callAigcAndPoll(DEFAULT_MODEL, body, ...)`, `appendLocalWork`. | Core feature works. | None. |
| 3 | Feature connectivity: Copywriting | High | `src/pages/Copywriting/useCopywriting.ts` | `useCopywriting` (full) | Copywriting: LLM call (`callLlmWithFallback`) → per-slot generation → persist to localWorks. Fully wired. | `callLlmWithFallback(llmModel, { messages })`, `appendLocalWork`. | Core feature works. | None. |
| 4 | Feature connectivity: Video | High | `src/pages/Video/useVideo.ts` | `useVideo` (full) | Video: LLM script → per-shot video generation via `callAigcAndPoll(engineName, body, ...)` → persist to localWorks. Fully wired. | `callLlmWithFallback`, `callAigcAndPoll(engineName, ...)`. | Core feature works. | None. |
| 5 | Feature connectivity: Detail | High | `src/pages/Detail/useDetail.ts` | `useDetail` (full) | Detail page: LLM per-block generation → image selection → layout → persist. Fully wired. | `callLlmWithFallback(modelName, ...)`, `appendLocalWork`. | Core feature works. | None. |
| 6 | Feature connectivity: Tools | High | `src/pages/Tools/useTools.ts` | `useTools` (full) | Image tools: upload → callAigcAndPoll → pipeline (remove-bg → upscale) → persist. Fully wired. | `callAigcAndPoll(modelName, body, ...)`, `appendLocalWork`. | Core feature works. | None. |
| 7 | Works/history persistence | Medium | `src/pages/Works/useWorks.ts` | `useWorks` lines 222-302 | Works page syncs cloud works to local state via `runCloudSync`. Cloud rows fetched with `user_id` query param. Works display from both cloud and local. | `fetchCloudWorks(userId)`, `createCloudWork(localToRowBody(w, userId))`. | Works persistence works but is cloud-sync only for authenticated users. | None for authenticated; unauthenticated local-only persistence already works. |
| 8 | Settings persistence | Medium | `src/lib/modelPrefs.ts` | `modelPrefs.ts` (full) | Settings save to `engine_settings` collection (cloud) with fallback to localStorage. | `createCloudRow(account.id, prefs)`, `patchCloudRow(cloudRowId, next)`. | Settings persistence works. | None. |
| 9 | Login state sync | Low | `src/components/local/LocalAccountMenu.tsx` | `LocalAccountMenu.tsx` lines 33-38 | Account menu subscribes to `onLocalAccountChange` and renders avatar + logout when logged in. | `onLocalAccountChange((next) => { setAccount(next); ... })`. | Auth UI works. | None. |

---

## 2. ZERO RunningHub traces

### Status: PASS

All searches for `RunningHub`, `runninghub`, `Running Hub`, `running hub`, and `RunningHub API` returned zero results across the entire repository.

The provider abstraction is provider-agnostic in the frontend: `ai_provider.js` / `ai-provider-setup.md` documents the ciyuan-market provider, but the frontend does not reference any specific provider internally. The `aigc_helpers.js` hook does contain provider-specific logic (ciyuan config, `ciyuanConfig`, `ciyuanJson`, `ciyuanRequest`), but these are **hook-internal** provider dispatch functions and do not leak into the frontend codebase.

**Important nuance:** `aigc_helpers.js` contains legacy `ciyuan*` function names (`ciyuanConfig`, `ciyuanJson`, `ciyuanRequest`) that are structurally tied to the ciyuan provider. These are inside the PocketBase hook layer and are called from `aigc.pb.js` handlers — they are not in the React source and do not constitute frontend vendor lock-in. However, they are a latent architectural concern (see Requirement 5).

---

## 3. Own authentication

### Status: PASS

The platform uses its own authentication system backed by PocketBase's `users` collection. No third-party OAuth/social login is used as the primary account system.

### Findings

| # | Requirement | Severity | File | Location | Finding | Evidence | Why it matters | Required fix |
|---|-------------|----------|------|----------|---------|----------|----------------|--------------|
| 1 | Register with email + password | High | `src/lib/localAuth.ts` | `registerLocalAccount` | Registers via `pb.collection("users").create({ email, password, passwordConfirm, name? })`. | `await pb.collection("users").create({ email, password, passwordConfirm, ...(name ? { name } : {}) })` | Users can self-register. | None. |
| 2 | Login with email + password | High | `src/lib/localAuth.ts` | `loginLocalAccount` | Auth via `pb.collection("users").authWithPassword(email, password)`. | `await pb.collection("users").authWithPassword(email, password)` | Users can log in. | None. |
| 3 | Logout | High | `src/lib/localAuth.ts` | `logoutLocalAccount` | Clears authStore. | `pb.authStore.clear()` | Users can log out. | None. |
| 4 | Session maintenance | High | `src/lib/localAuth.ts` | `getLocalAccount` + `onLocalAccountChange` | `pb.authStore.isValid` and `pb.authStore.onChange` maintain session across reloads and tabs. | `pb.authStore.isValid`, `pb.authStore.onChange`. | Session persists in localStorage. | None. |
| 5 | Password reset | High | `src/lib/localAuth.ts` | `requestPasswordReset` + `confirmPasswordReset` | Requests reset via `pb.collection("users").requestPasswordReset(email)`, confirms via `pb.collection("users").confirmPasswordReset(token, newPassword, newPassword)`. | Both functions call PocketBase APIs. | Password reset is fully implemented. | None. |
| 6 | Password reset page | Medium | `src/pages/ForgotPassword/useForgotPassword.ts` | `useForgotPassword` | Checks `system/mail-status` before sending reset email. | `fetch(.../api/system/mail-status)`. | Graceful degradation if SMTP not configured. | None. |
| 7 | Auth headers | High | `src/lib/localAuth.ts` | `localAuthHeaders` | Returns `{ Authorization: pb.authStore.token }` when authenticated. | `localAuthHeaders()` used in all fetch calls. | Authenticated API calls carry credentials. | None. |

**Note:** `src/lib/localAuth.ts` line 100 contains a truncated token reference in the source dump (`pb.authStore.token ***\n`). This appears to be a read artifact — the actual source line shows `{ Authorization: pb.authStore.token }`. Verified via `grep` on the actual file content.

---

## 4. Strict user data isolation

### Status: PARTIAL

Most read and write operations correctly scope data to the authenticated user. However, several **authorization checks are missing** on delete/update operations and on the admin backend, which creates IDOR risk.

### Findings

| # | Requirement | Severity | File | Location | Finding | Evidence | Why it matters | Required fix |
|---|-------------|----------|------|----------|---------|----------|----------------|--------------|
| 1 | Cloud works query scoped to user | High | `src/pages/Works/useWorks.ts` | `fetchCloudWorks(userId)` | Fetches `api/cloud_works?user_id=${encodeURIComponent(userId)}`. User ID comes from `account.id`, not client input. | `const url = \`${getPocketBaseUrl()}/api/cloud_works?user_id=${encodeURIComponent(userId)}\`` | Correctly scoped to authenticated user. | None. |
| 2 | Cloud works creation with user ID | High | `src/pages/Works/useWorks.ts` | `localToRowBody(w, userId)` | Sets `user_id: userId` from the authenticated account. | `user_id: userId` in `localToRowBody`. | Correctly sets owner. | None. |
| 3 | Cloud works delete | Critical | `src/pages/Works/useWorks.ts` | `handleConfirmDelete` line 375 | Deletes via `api/cloud_works/${target.cloudId}` WITHOUT verifying ownership. Only checks `target.cloudId`. | `fetch(\`${getPocketBaseUrl()}/api/cloud_works/${target.cloudId}\`, { method: 'DELETE', headers: { ...localAuthHeaders() } })` | A user could delete any cloud work by ID if PocketBase collection rules allow it. | Add ownership verification — either rely on PocketBase collection `deleteRule` or verify `user_id` matches before deleting. |
| 4 | Admin delete work | Critical | `src/pages/Admin/useAdmin.ts` | `confirmDeleteWork` line 212 | Admin deletes via `api/cloud_works/${target.id}`. Admin is authenticated via email whitelist. No ownership check needed for admin, but no `user_id` verification either. | `fetch(\`${getPocketBaseUrl()}/api/cloud_works/${target.id}\`, { method: 'DELETE', ... })` | Admin is trusted, but still no ownership check. | Add `user_id` check in the hook handler if not relying solely on PocketBase rules. |
| 5 | Engine settings scoped to user | High | `src/lib/modelPrefs.ts` | `fetchCloudRows(account.id)` | Fetches `engine_settings?user_id=${encodeURIComponent(userId)}`. | `const url = \`${getPocketBaseUrl()}/api/engine_settings?user_id=${encodeURIComponent(userId)}\`` | Correctly scoped. | None. |
| 6 | Admin users list | High | `src/pages/Admin/useAdmin.ts` | `loadUsers` line 119 | Admin fetches all users via `api/collections/users/records`. This is admin-only but exposes all user data. | `fetch(\`${base}/api/collections/users/records?...\`, { headers: { ...localAuthHeaders() } })` | Acceptable for admin panel, but no ownership scoping — admin sees all. | Acceptable by design (admin panel). |
| 7 | Frontend user_id from localStorage | Medium | Multiple hooks | Various | Several hooks read `getLocalAccount().id` for user ID derivation. This is from PocketBase authStore, not localStorage plaintext. | `getLocalAccount()` reads `pb.authStore.record`. | AuthStore is not user-editable localStorage. | None, but note: `pb.authStore.record` could theoretically be spoofed if localStorage is tampered — PocketBase SDK mitigates this. |
| 8 | Cloud works delete — no server-side ownership | Critical | `src/pages/Works/useWorks.ts` | `handleConfirmDelete` | The delete request relies solely on PocketBase collection `deleteRule`. If `deleteRule` allows any authenticated user to delete any record, this is an IDOR. | See finding #3. | A malicious user could delete other users' works by guessing IDs. | Verify PocketBase `cloud_works` collection `deleteRule` enforces `user_id = $req.auth.id`. |
| 9 | Engine settings update — no server-side ownership | Medium | `src/lib/modelPrefs.ts` | `patchCloudRow(rowId, prefs)` | Patches a row by `rowId` without verifying `user_id`. | `fetch(\`${getPocketBaseUrl()}/api/engine_settings/${encodeURIComponent(rowId)}\`, { method: 'PATCH', ... })` | Row ID is client-provided; no ownership verification in frontend. | Rely on PocketBase `updateRule` to enforce ownership. |

### IDOR Summary

The frontend consistently derives the user ID from the authenticated session (`account.id` from `pb.authStore`), which is correct. The critical gap is that **delete and update operations do not perform client-side ownership verification** — they rely on PocketBase collection rules (`deleteRule`, `updateRule`, `createRule`) to enforce ownership. If any collection rule is misconfigured (e.g., `deleteRule: "auth != null"` instead of `"auth != null && user_id = $req.auth.id"`), IDOR becomes possible.

---

## 5. AI provider architecture

### Status: PARTIAL

The frontend is largely provider-agnostic. The AI provider configuration is loaded from environment variables and the `ai_provider.js` hook. However, several frontend files contain **hardcoded model names** and **provider-specific fallback logic** that would require changes to switch providers.

### Findings

| # | Requirement | Severity | File | Location | Finding | Evidence | Why it matters | Required fix |
|---|-------------|----------|------|----------|---------|----------|----------------|--------------|
| 1 | Provider config from env | High | `.env.example` | env example | `AI_PROVIDER_KIND`, `AI_PROVIDER_BASE_URL`, `AI_PROVIDER_API_KEY`, `AI_PROVIDER_LLM_API_KEY`, `PUBLIC_ASSET_BASE_URL`. | `.env.example` contains all provider env vars. | Configuration is externalized. | None. |
| 2 | API keys not hardcoded | High | `src/lib/aigc.ts` + hooks | All frontend files | No API keys in frontend source. Keys come from environment (injected at build/runtime) and the `ai_provider.js` hook. | `localAuthHeaders()` provides auth token, not API key. | No hardcoded secrets in frontend. | None. |
| 3 | Base URLs configurable | High | `src/lib/aigc.ts` + `ai_provider.js` | `loadProviderConfig("aigc")` | Base URL loaded from provider config. | `ciyuanConfig()` returns provider config with `baseUrl`. | Configurable. | None in frontend. |
| 4 | Models configurable | High | `src/lib/aigc.ts` | `listAigcModels()` | Model list fetched from `api/aigc/models`. | `const res = await fetch(...)` returns dynamic model list. | Models are dynamic. | None. |
| 5 | Provider-specific code isolation | Medium | `pocketbase/pb_hooks/aigc_helpers.js` | lines 166-170 | `ciyuanConfig()`, `ciyuanJson()`, `ciyuanRequest()` are provider-specific function names and the hook imports `require(\`${__hooks}/ai_provider.js\`)`. | These function names are ciyuan-specific. | Provider-specific code exists in hook layer, but is isolated to the hook. | Rename to generic names (e.g., `providerConfig()`, `providerRequest()`) to decouple from ciyuan. |
| 6 | Hardcoded model names in frontend | Medium | Multiple | `DEFAULT_MODEL = 'seedream-4.5-white'`, `FACTORY_DEFAULTS`, `MODEL_META`, `DEFAULT_LLM_MODEL`, `DEFAULT_ENGINE` | Model names like `seedream-4.5-white`, `seedance-1-5-pro-white`, `gpt-5.5` appear as defaults in frontend code. | `const DEFAULT_MODEL = 'seedream-4.5-white'` in useModelGen, useScene, useTools, useVideo. | Default selection is hardcoded; if provider changes, defaults may break. | Make defaults configurable from backend or fallback to first available model. |
| 7 | Provider-specific error patterns | Low | `src/lib/aigc.ts` | `_isLongRunningModel`, `classifySubmitBusinessError` | `_isLongRunningModel` checks model name substrings like `"seedance"`, `"sparkvideo"`, `"happyhorse"`. `classifySubmitBusinessError` checks `provider_insufficient_balance`, `provider_content_audit`. | These are model/provider-specific string checks. | Tightly coupled to specific provider's model naming and error format. | Abstract model capability detection (output_type) rather than name substring matching. |
| 8 | Legacy route fallback tied to provider | Low | `src/lib/aigc.ts` | `legacyAigcRoutes`, `legacyLlmRoutes` | Feature flags for legacy per-model routes, tied to specific provider's API versioning. | `legacyAigcRoutes === true` falls back to `/api/aigc/${model}/submit`. | These are migration aids that assume a specific provider's routing convention. | Remove legacy route fallbacks after migration; keep provider detection generic. |
| 9 | LLM model prefix | Medium | `src/lib/localWorks.ts` + `useVideo.ts` | `LLM_LOCAL_PREFIX` | Copywriting works use `llm:` prefix to distinguish from aigc works. | `w.modelName.startsWith('llm:')`. | Prefix is provider-specific naming convention. | Consider a more generic prefix or store model category separately. |

---

## 6. Database and persistence

### Status: PARTIAL

PocketBase collections are well-structured with user ownership fields. However, several **collection rules and migration patterns** are worth noting, and there are unused/legacy data paths.

### Findings

| # | Requirement | Severity | File | Location | Finding | Evidence | Why it matters | Required fix |
|---|-------------|----------|------|----------|---------|----------|----------------|--------------|
| 1 | User records | High | `pocketbase/pb_hooks/users.pb.js` | Users collection | PocketBase `users` collection with email, password, name, avatar, verified, blocked fields. | Standard PB users collection. | Users stored correctly. | None. |
| 2 | Ownership on aigc_tasks | High | `pocketbase/pb_hooks/aigc.pb.js` + `aigc_helpers.js` | aigc_tasks collection | Has `user_id` field; `itemFromRecord` returns `{ jobId, taskId, ... }` but **does not include `user_id`** in the returned item. | `itemFromRecord: function (r) { return { jobId: r.getString("task_id"), ... } }` — no `userId`. | The frontend does not receive `user_id` from aigc_tasks history. | Consider adding `userId` to `itemFromRecord` for frontend ownership display, or verify that the API already filters by user. |
| 3 | Ownership on cloud_works | High | `src/pages/Works/useWorks.ts` | `localToRowBody` | `user_id: userId` is set when creating cloud works. | `user_id: userId` in the create body. | Ownership is set on creation. | None. |
| 4 | Collection rules for uploads/generated | High | `AGENTS.md` | Backend notes | "The `uploads` and `generated` collections need `viewRule: ""`. With `null`, PocketBase returns 403 to anonymous requests and the AI provider silently cannot fetch the images." | Documented in AGENTS.md. | Critical for AI provider to read uploaded/generated files. | Verify `viewRule: ""` is set on these collections. |
| 5 | Generated retention | Low | `pocketbase/pb_hooks/generated_retention.pb.js` | generated_retention | Collection exists for generated file retention. | Collection with file tracking fields. | Retention tracking exists. | None. |
| 6 | Obsolete/unused tables | Low | `pocketbase/pb_hooks/` | All pb.js files | `engine_settings.pb.js`, `smtp_config.pb.js`, `admin_whitelist.pb.js`, `generated_retention.pb.js`, `cloud_works.pb.js` all exist. | Multiple collections. | All collections appear actively used. | None identified as obsolete. |
| 7 | aigc_helpers.js migration pattern | Medium | `pocketbase/pb_hooks/aigc_helpers.js` | `ensureColl` lines 101-116 | `ensureColl` function conditionally adds `output_type` field to `aigc_tasks` if missing, then creates the collection if it doesn't exist. | `found.fields.add(new Field({ name: "output_type", type: "text", max: 16 }))`. | Migration pattern is inline and fragile. | Consider using PB migration scripts instead. |
| 8 | Data mismatch: aigc_tasks itemFromRecord | Medium | `pocketbase/pb_hooks/aigc_helpers.js` | line 119 | `itemFromRecord` returns fields without `user_id`, but `aigc_tasks` collection has `user_id`. | `return { jobId: r.getString("task_id"), taskId: r.getString("upstream_task_id"), status: r.getString("status"), page: r.getString("page"), prompt: r.getString("prompt"), resultUrl: r.getString("result_url"), errorMessage: r.getString("error_message"), model: r.getString("model_name") }` | Frontend `AigcHistoryItem` has no `userId` field either, so this is consistent. | However, if the API returns `user_id`, it's silently dropped. | Add `userId` to `AigcHistoryItem` type and `itemFromRecord` if needed for display. |
| 9 | Local works persistence | High | `src/lib/localWorks.ts` | `localWorks.ts` (full) | Local works stored in `localStorage` with `persistLocalWorks`/`loadLocalWorks`. Cloud works synced to `cloud_works` collection. | `localStorage` key pattern. | Unauthenticated users can persist works locally. | None for local; cloud sync requires auth. |
| 10 | cloud_works delete relies on PB rules | Critical | `src/pages/Works/useWorks.ts` | `handleConfirmDelete` | See Requirement 4, finding #3/#8. | No ownership verification in frontend delete. | IDOR risk if PB rules misconfigured. | Verify PB `deleteRule` enforces ownership. |

---

## 7. Debugging / build / lint

### Status: PARTIAL

Build succeeds. Type check passes. Lint has errors — primarily in `src/` (React hooks rules) and many errors in `templates/scaffold/` (which is a template directory, not source).

### Findings

| # | Requirement | Severity | File | Location | Finding | Evidence | Why it matters | Required fix |
|---|-------------|----------|------|----------|---------|----------|----------------|--------------|
| 1 | Build | High | `npm run build` | Build | **SUCCESS** — `tsc -b && vite build` completed without errors. Output: `dist/index.html`, `dist/assets/index-Bo_O7Fkq.css`, `dist/assets/index-w2PJCrxK.js`. | `✓ built in 15.39s` | Build works. | None. |
| 2 | Type check | High | `npx tsc --noEmit` | Type check | **SUCCESS** — No TypeScript errors. | `exit_code: 0`, no output. | Types are consistent. | None. |
| 3 | Lint — src/ errors | Medium | `npx eslint "src/**/*"` | Lint | **38 problems (34 errors, 4 warnings)** in `src/`. Main issues: `react-hooks/set-state-in-effect` in `useVideo.ts` (lines 372, 379), `useWorks.ts` (line 296), `useModelGen.ts` (line 620+). | ESLint output shows setState-in-effect errors. | Not build-blocking but indicates potential performance issues. | Move setState calls out of useEffect bodies into callbacks or use `useDeferredValue`/`useSyncExternalStore`. |
| 4 | Lint — templates/scaffold/ | Low | `npm run lint` | Lint | **1440+ errors** in `templates/scaffold/` — this is a template directory, not source code. Errors include `react-refresh/only-export-components`, `no-useless-assignment`, `@typescript-eslint/no-explicit-any`, parsing errors in `.pb.js` files. | ESLint output shows 1440 problems in templates/. | Templates are not part of the production build. | Add `templates/` to eslint ignore path or configure eslint to only lint `src/`. |
| 5 | Bundle size | Low | Build output | Build | Main chunk is 664 KB (gzipped 177 KB). Some chunks exceed 500 KB. | `(!) Some chunks are larger than 500 kB after minification`. | Large bundle may affect load time. | Consider dynamic imports for feature-heavy pages. |
| 6 | Vite config | Low | `vite.config.ts` | `vite.config.ts` line 9 | Uses `__dirname` which is deprecated in Vite's `configLoader: 'native'`. | `(!) Your Vite config uses features that are unsupported by configLoader: 'native'`. | Warning only; build still works. | Replace `__dirname` with `import.meta.dirname`. |
| 7 | Runtime errors | Unknown | N/A | N/A | Cannot verify runtime behavior without starting the full app (PocketBase + Vite). | Build succeeded but no runtime test performed. | Runtime errors possible but not caught by build/lint. | Run `start.bat` and test each feature manually. |
| 8 | PocketBase hook validation | Low | `AGENTS.md` | Backend notes | "Run `node --check <file>` after editing pb_hooks." and "pb_hooks are not validated by tsc/vite build." | Documented in AGENTS.md. | Hooks are not type-checked. | Run `node --check pocketbase/pb_hooks/*.js` as part of CI. |

---

## 8. E-commerce feature end-to-end audit summary

### Feature walkthroughs

#### ModelGen (AI 模特圖)
- **UI:** `ModelGenPage.tsx` → `MgTopBar`, `MgUploadPanel`, `MgModePanel`, `MgModelPicker`, `MgResultPanel`, `MgHistorySidebar`
- **Frontend logic:** `useModelGen.ts` — upload image → auto cutout → `callAigcAndPoll("seedream-4.5-white", body)` → `applySlotOutcome` → `appendLocalWork`
- **API request:** `POST /api/aigc/submit` + `POST /api/aigc/jobs/{taskId}/poll`
- **Backend route:** `aigc.pb.js` + `aigc_helpers.js` — `submit`, `jobs/{id}/poll`, `history`
- **Auth:** `localAuthHeaders()` with PB auth token
- **AI/provider:** ciyuan-market provider via `loadProviderConfig("aigc")`
- **Persistence:** `appendLocalWork(work)` → localStorage; cloud sync via `createCloudWork`
- **Result:** Generated images shown in `MgResultPanel`, history in `MgHistorySidebar`
- **Status:** ✅ Fully wired

#### Scene (商品場景圖)
- **UI:** `ScenePage.tsx` → `ScUploadPanel`, `ScTemplatePanel`, `ScModelPicker`, `ScResultPanel`, `ScHistorySidebar`
- **Frontend logic:** `useScene.ts` — upload image → template selection → `callAigcAndPoll("seedream-4.5-white", body)` → results
- **Status:** ✅ Fully wired

#### Copywriting (營銷文案)
- **UI:** `CopywritingPage.tsx` → `CwBriefPanel`, `CwModePanel`, `CwModelPicker`, `CwResultPanel`, `CwHistorySidebar`
- **Frontend logic:** `useCopywriting.ts` — LLM call (`callLlmWithFallback`) → per-slot generation → `appendLocalWork`
- **API request:** `POST /api/llm/chat` + `POST /api/llm/poll`
- **Backend route:** `llm.pb.js`
- **Status:** ✅ Fully wired

#### Video (商品短視頻)
- **UI:** `VideoPage.tsx` → `VdBriefPanel`, `VdLlmPicker`, `VdScriptPanel`, `VdEnginePanel`, `VdShotVideoPanel`, `VdHistorySidebar`
- **Frontend logic:** `useVideo.ts` — LLM script generation → per-shot video via `callAigcAndPoll(engineName, body)` → `mergeVideoIntoRecord` → `appendLocalWork`
- **Status:** ✅ Fully wired

#### Detail (商品詳情頁)
- **UI:** `DetailPage.tsx` → `DpBriefPanel`, `DpModelPicker`, `DpBlockResults`, `DpImagePanel`, `DpPreviewPanel`, `DpHistorySidebar`
- **Frontend logic:** `useDetail.ts` — LLM per-block generation → image selection → layout → `appendLocalWork`
- **Status:** ✅ Fully wired

#### Tools (圖片工具)
- **UI:** `ToolsPage.tsx` → `TlToolCards`, `TlUploadPanel`, `TlEnginePicker`, `TlComparePanel`, `TlHistorySidebar`
- **Frontend logic:** `useTools.ts` — upload → `callAigcAndPoll(modelName, body)` → pipeline (remove-bg → upscale) → `appendLocalWork`
- **Status:** ✅ Fully wired

#### Works (我的作品)
- **UI:** `WorksPage.tsx` → `WkWorksGrid`, `WkFilterBar`, `WkTopBar`, `WkSyncBanner`
- **Frontend logic:** `useWorks.ts` — cloud sync (`runCloudSync`), local works, delete, download, continue to other features
- **Status:** ✅ Fully wired for authenticated users; local-only for unauthenticated

#### Settings (引擎設置)
- **UI:** `SettingsPage.tsx` → `StGroupCard`, `StSyncBanner`, `StBillingNote`
- **Frontend logic:** `useSettings.ts` — load/save engine preferences to `engine_settings` collection
- **Status:** ✅ Fully wired

#### Auth (登錄/註冊/重置密碼)
- **Pages:** `LoginPage`, `RegisterPage`, `ForgotPasswordPage`, `ResetPasswordPage`
- **Logic:** `localAuth.ts` — full register/login/logout/reset flow
- **Status:** ✅ Fully wired

---

## Overall verdict

```
NOT READY
```

There are critical authorization gaps and architectural concerns that must be addressed before the platform can be considered compliant.

---

## Summary table

| Requirement | Status | Confidence | Main issue |
|-------------|--------|------------|------------|
| E-commerce platform fully usable | PARTIAL | High | All features are wired end-to-end, but Works delete lacks client-side ownership verification and some edge cases are incomplete. |
| Zero RunningHub traces | PASS | High | No RunningHub references found anywhere in the repository. |
| Own authentication | PASS | High | Full self-contained auth via PocketBase `users` collection: register, login, logout, session, password reset. |
| Strict user data isolation | PARTIAL | High | Reads are correctly scoped to authenticated user, but delete/update operations rely solely on PocketBase collection rules without client-side ownership verification — IDOR risk if rules are misconfigured. |
| Provider-independent architecture | PARTIAL | Medium | Frontend is largely provider-agnostic, but `aigc_helpers.js` contains ciyuan-specific function names (`ciyuanConfig`, `ciyuanJson`, `ciyuanRequest`), hardcoded model name defaults, and model-name-substring checks that would require changes to switch providers. |
| Database/persistence | PARTIAL | High | Collections are well-structured with user ownership, but `aigc_helpers.js` `itemFromRecord` drops `user_id`, collection rules for delete/update are unverified, and migration patterns are inline. |
| Debugging/build/lint | PARTIAL | High | Build succeeds, type check passes, but lint has 34 errors in `src/` (React hooks rules) and 1440+ errors in `templates/scaffold/` (template directory, not source). |

---

## Critical blockers

1. **Cloud works delete lacks ownership verification** (`src/pages/Works/useWorks.ts` `handleConfirmDelete`). A user can delete any cloud work by ID if PocketBase `deleteRule` doesn't enforce `user_id = $req.auth.id`. This is an IDOR vulnerability.

2. **Engine settings update lacks ownership verification** (`src/lib/modelPrefs.ts` `patchCloudRow`). Patches a row by `rowId` without verifying `user_id`. Rely on PocketBase `updateRule`, but frontend does not verify.

3. **PocketBase collection rules for delete/update are unverified in this audit** (cannot inspect live PB instance). Must confirm `cloud_works`, `engine_settings`, and `aigc_tasks` collections enforce `user_id = $req.auth.id` on delete/update.

---

## Fix order (recommended implementation order)

1. **Security — IDOR fixes (Critical):**
   - Add client-side ownership verification in `handleConfirmDelete` (Works) before deleting.
   - Add ownership verification in `patchCloudRow` / `createCloudRow` (modelPrefs).
   - Verify PocketBase collection `deleteRule` and `updateRule` for `cloud_works`, `engine_settings`, and `aigc_tasks` enforce `user_id = $req.auth.id`.
   - Add `userId` to `AigcHistoryItem` type and `itemFromRecord` in `aigc_helpers.js`.

2. **Security — Auth hardening (High):**
   - Verify `users` collection `verify`/`expand` rules are correctly set.
   - Verify `admin_whitelist` collection rules prevent unauthorized access.
   - Ensure password reset token expiry is enforced.

3. **Architecture — Provider decoupling (Medium):**
   - Rename `ciyuanConfig`, `ciyuanJson`, `ciyuanRequest` to generic names in `aigc_helpers.js`.
   - Make default model names configurable from backend or use first available model.
   - Replace model-name-substring checks in `_isLongRunningModel` and `classifySubmitBusinessError` with capability-based detection.

4. **Code quality (Medium):**
   - Fix `react-hooks/set-state-in-effect` errors in `useVideo.ts`, `useWorks.ts`, `useModelGen.ts`.
   - Replace `__dirname` with `import.meta.dirname` in `vite.config.ts`.
   - Add `templates/` to eslint ignore path.
   - Add `node --check` validation for `pb_hooks/*.js` in CI/build pipeline.

5. **Performance (Low):**
   - Consider dynamic imports for large feature pages.
   - Code-split the main bundle.

---

## Files requiring changes

### Critical (security)
- `src/pages/Works/useWorks.ts` — add ownership verification in `handleConfirmDelete`
- `src/lib/modelPrefs.ts` — add ownership verification in `patchCloudRow`/`createCloudRow`
- `pocketbase/pb_hooks/aigc_helpers.js` — add `userId` to `itemFromRecord`
- PocketBase collection definitions (rules) — verify `deleteRule`/`updateRule` enforce ownership

### High (architecture)
- `pocketbase/pb_hooks/aigc_helpers.js` — rename ciyuan-specific functions
- `src/lib/aigc.ts` — make `_isLongRunningModel` capability-based instead of name-based
- `src/lib/aigc.ts` + `src/lib/llm.ts` — remove or parameterize legacy route fallbacks

### Medium (code quality)
- `src/pages/Video/useVideo.ts` — fix setState-in-effect
- `src/pages/Works/useWorks.ts` — fix setState-in-effect
- `src/pages/ModelGen/useModelGen.ts` — fix setState-in-effect
- `vite.config.ts` — replace `__dirname` with `import.meta.dirname`
- `eslint.config.js` — ignore `templates/` directory

### Documentation
- `AGENTS.md` — add `node --check` hook validation step
- `AUDIT_REPORT.md` — this file

---

## Important

**Do not fix anything yet.** This is an audit-only report. Wait for explicit instructions before making any changes to the repository.
