# 01X E-commerce AI

React + Vite frontend, PocketBase backend (`pocketbase/pb_hooks/*.pb.js`).

## Run locally

    start.bat            # or: powershell -File scripts/start.ps1

Starts PocketBase on :7000 and Vite on :8000. Vite proxies `/__pb` to PocketBase,
so the browser only ever talks to :8000.

Secrets live in `.env.local` (never committed):

    AI_PROVIDER_KIND=ciyuan-market
    AI_PROVIDER_BASE_URL=https://api.ciyuan-market.com/api/v1
    AI_PROVIDER_API_KEY=
    AI_PROVIDER_LLM_API_KEY=
    PUBLIC_ASSET_BASE_URL=      # public https base the provider can fetch uploads from

## Backend notes that will bite you

- **PocketBase does not hot-reload hooks on Windows.** Restart it after editing `pb_hooks`.
- **Each `routerAdd` handler is an isolated scope.** Top-level consts and functions in a
  `.pb.js` are invisible inside handlers. Use `require(`${__hooks}/aigc_helpers.js`)` *inside*
  each handler.
- **`tsc` and `vite build` do not validate `pb_hooks`.** Run `node --check <file>` after editing.
- The `uploads` and `generated` collections need `viewRule: ""`. With `null`, PocketBase returns
  403 to anonymous requests and the AI provider silently cannot fetch the images.
- The provider needs a **publicly reachable** URL for input images. Locally that means a tunnel:
  `cloudflared tunnel --url http://127.0.0.1:7000`, then set `PUBLIC_ASSET_BASE_URL` to the
  hostname it prints.
