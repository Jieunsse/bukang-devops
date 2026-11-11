import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import prettier from 'eslint-config-prettier/flat'
import { defineConfig, globalIgnores } from 'eslint/config'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  // node로 바로 돌리는 CommonJS 스크립트(API 흐름 추출)는 require로 불러온다.
  { files: ['scripts/**/*.cjs'], rules: { '@typescript-eslint/no-require-imports': 'off' } },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'coverage/**', 'next-env.d.ts', '.claude/**']),
])

export default eslintConfig
