# AI Provider Setup

The app routes all AI generation calls through the PocketBase backend (`pocketbase/pb_hooks/aigc.pb.js` and `llm.pb.js`). **There is no built-in default provider** — configure ciyuan-market explicitly through environment variables.

## Required environment variables

**There is no built-in default AI provider.** You must set every required variable below, otherwise the app will fail at startup/request time with a clear configuration error.

Copy `.env.example` to `.env` (and to PocketBase’s environment if you run it separately) and set:

| Variable | Example | Purpose |
|----------|---------|---------|
| `AI_PROVIDER_KIND` | `ciyuan-market` | Provider registry key. |
| `AI_PROVIDER_BASE_URL` | `https://api.ciyuan-market.com/api/v1` | Base URL for image/video and LLM calls. |
| `AI_PROVIDER_API_KEY` | — | Server-side API key for image/video generation. **Never expose to the client.** |
| `AI_PROVIDER_LLM_API_KEY` | falls back to `AI_PROVIDER_API_KEY` | Server-side API key for LLM. |

## How it works

- `pocketbase/pb_hooks/ai_provider.pb.js` defines a small registry (`AI_PROVIDER_REGISTRY`) and shared helpers:
  - `loadAigcProviderConfig()` / `loadLlmProviderConfig()`
  - `readProviderApiKey(ev, config)`
  - `buildProviderAuthHeaders(ev, baseHeaders)`
- `aigc.pb.js` and `llm.pb.js` call the provider module. Provider settings are read inside request handlers.
- API keys are read from environment variables on the server and are never sent to the browser.

## Adding another provider

1. Add a new entry to `AI_PROVIDER_REGISTRY` in `pocketbase/pb_hooks/ai_provider.pb.js`:
   - `aigcBaseUrl`, `llmBaseUrl`
   - `defaultAppCode`
   - `authErrorPatterns`, `balanceErrorPatterns`, `auditErrorPatterns`
   - `errorCodes` (use `provider_*` codes and keep them in sync with `src/lib/aigc.ts`)
   - `outputUrlRewrites` (optional CDN rewrites)
2. Update the model registries in `aigc.pb.js` (`ALLOWED_MODELS`) and `llm.pb.js` (`ALLOWED_MODELS`) to map your model short names to the provider’s endpoints/model IDs.
3. Set the env vars and restart PocketBase.

No UI or business-logic code needs to change as long as the new provider exposes the same request/response shape.

## Testing

After changing env vars:

```bash
npm run build
# start PocketBase with the env vars loaded, then exercise the generate flows
```

If a required provider variable is missing, the backend throws a clear configuration error at startup/request time. If the API key is missing, the backend returns HTTP 412 with `error: "login_required"`, which the UI maps to a login prompt.
