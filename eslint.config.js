import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    // PocketBase 自帶的產生型別宣告，不是我們的原始碼
    'pocketbase/types.d.ts',
    'pocketbase/pb_data',
    // 匯出時附帶的腳手架，不進版本庫也不該計入 lint
    'templates',
    'plans',
    '.vibex',
    'vibex-local',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
])
