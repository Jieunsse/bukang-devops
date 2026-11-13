// 원본 주소와 리포트 HTML을 함께 reports/public-key.pem으로 암호화해 reports/<slug>.enc.json에 쓴다. 개인키는 필요 없다.
// 사용: node --experimental-strip-types scripts/seal-report.mjs <slug> <원본 주소> <html 파일>
import { readFileSync, writeFileSync } from 'node:fs'

import { sealReport } from '../src/shared/api/reports/crypto.ts'

const [slug, url, htmlPath] = process.argv.slice(2)
if (!slug || !url?.startsWith('https://') || !htmlPath || !/^[a-z0-9-]+$/.test(slug)) {
  console.error(
    '사용: node --experimental-strip-types scripts/seal-report.mjs <slug> <원본 주소> <html 파일>',
  )
  process.exit(1)
}
const sealed = sealReport(
  JSON.stringify({ url, html: readFileSync(htmlPath, 'utf8') }),
  readFileSync('reports/public-key.pem', 'utf8'),
)
writeFileSync(`reports/${slug}.enc.json`, JSON.stringify(sealed) + '\n')
console.log(`reports/${slug}.enc.json 저장`)
