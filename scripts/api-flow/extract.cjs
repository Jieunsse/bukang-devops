#!/usr/bin/env node
// 크루런 프론트 코드를 TypeScript 컴파일러로 읽어, 화면 주소마다 백엔드에 보내는 요청을 뽑는다.
// 쓰는 법: node scripts/api-flow/extract.cjs [frontend 폴더]   (기본값: 이 저장소 옆의 frontend, 워크트리에서 돌려도 원래 저장소 기준)
// 결과: src/entities/api-flow/data/api-flow.json
//
// 화면(page.tsx · route.ts)과 그 위 묶음 레이아웃(layout.tsx)에서 시작해, 코드가 실제로 가리키는 함수 · 변수 선언만 따라간다.
// orval이 만든 요청 함수에 닿으면 그 함수의 메서드와 주소를 적는다. 캐시 키 함수(QueryKey · MutationKey)는 요청이 아니라서 세지 않는다.
const path = require('path')
const fs = require('fs')
const { execFileSync } = require('child_process')

const { layoutsOf, opOf, routeOf } = require('./naming.cjs')

const git = (dir, ...args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' }).trim()
// devops/는 크루런 모노레포 안에 있다. 워크트리에서도 원래 저장소의 .git 위치로 모노레포를 찾는다.
const REPO = path.dirname(path.resolve(__dirname, git(__dirname, 'rev-parse', '--git-common-dir')))
const FE = path.resolve(process.argv[2] ?? path.join(REPO, '../frontend'))
const OUT = path.join(__dirname, '../../src/entities/api-flow/data/api-flow.json')
const ts = require(path.join(FE, 'node_modules/typescript'))
const GEN = path.join(FE, 'src/shared/api/generated')

// 거의 모든 화면이 부르는 요청은 화면별 표에서 빼고 페이지 위 공통 규칙에 적는다.
// 알림 목록은 알림 화면에만 남긴다.
const COMMON = new Set(['GET /api/v1/notification/notifications', 'GET /api/v1/file/files'])
const KEEP_COMMON = { 'GET /api/v1/notification/notifications': /^\/notifications/ }

// orval 밖에서 직접 쓴 주소 문자열을 요청으로 바꾸는 규칙. null이면 요청이 아니라서 버린다.
const RAW_RULES = [
  [/^RAW \/api\/v1\/auth\/oauth2\/authorize$/, '이동 /api/v1/auth/oauth2/authorize/{provider}'],
  [/^TPL `\$\{AUTHORIZE_PATH\}/, null],
  [/^RAW \/api\/v1\/notification\/notifications$/, 'GET /api/v1/notification/notifications'],
  [
    /^TPL `\$\{BASE\}\/\$\{encodeURIComponent\(id\)\}\/read`$/,
    'POST /api/v1/notification/notifications/{id}/read',
  ],
  [/^TPL `\$\{BASE\}\/read-all`$/, 'POST /api/v1/notification/notifications/read-all'],
  [/^RAW \/admin\/stats\/data$/, 'GET /admin/stats/data?section={구역}'],
  [/^TPL `\$\{STATS_URL\}/, null],
  [
    /^RAW \/api\/v1\/member\/admin\/sellers\?status=PENDING$/,
    'GET /api/v1/member/admin/sellers?status=PENDING',
  ],
  // 화면 이동 주소와 오류 문구를 고를 때 쓰는 앞부분 비교
  [/^TPL `\$\{(LOGIN_PATH|origin)\}/, null],
  [/^RAW \/admin\/stats$/, null],
  [/^RAW \/api\/(v1\/(cash|order)\/)?$/, null],
]

function loadOps() {
  const ops = {}
  for (const svc of fs.readdirSync(GEN)) {
    const file = path.join(GEN, svc, `${svc}.ts`)
    if (!fs.existsSync(file)) continue
    const t = fs.readFileSync(file, 'utf8')
    for (const m of t.matchAll(/export const get(\w+)Url = \(([\s\S]*?)\n\}\n/g)) {
      const name = m[1][0].toLowerCase() + m[1].slice(1)
      const urls = [...m[2].matchAll(/`(\/[^`]*)`/g)].map((x) => x[1])
      const url = (urls.at(-1) ?? '?').replace(/\?\$\{.*$/, '').replace(/\$\{(\w+)\}/g, '{$1}')
      const method = new RegExp(`export const ${name} = async[\\s\\S]*?method: '(\\w+)'`).exec(
        t,
      )?.[1]
      ops[`${svc}:${name}`] = `${method ?? '?'} ${url}`
    }
  }
  return ops
}

// 요청을 보내는 공통 도구(토큰 · 재발급 · 응답 풀기)는 모든 화면이 지나므로 따라가지 않는다.
const SKIP =
  /shared\/api\/(fetcher|access-token|auth-session|rs-data|api-error|query-client|idempotency|use-idempotency-key)\.ts$/

function trace(program, checker, ops, entryFiles, unknownNames) {
  const seen = new Set()
  const found = new Set()
  const stack = entryFiles.map((f) => program.getSourceFile(f))
  while (stack.length) {
    const node = stack.pop()
    if (!node || seen.has(node)) continue
    seen.add(node)
    const sf = node.getSourceFile()
    const walk = (n) => {
      if (ts.isTypeNode(n) && !ts.isExpressionWithTypeArguments(n)) return
      if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) return
      if (
        (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) &&
        /^\/(api|admin\/stats)/.test(n.text)
      ) {
        found.add(`RAW ${n.text}`)
      }
      if (ts.isTemplateExpression(n)) {
        const text = n.getText(sf)
        if (/\/api\/|_URL|BASE|PATH/.test(text)) found.add(`TPL ${text}`)
      }
      if (ts.isIdentifier(n)) {
        // { mutationFn }처럼 줄여 쓴 속성은 속성이 아니라 값 쪽을 따라간다.
        let sym =
          ts.isShorthandPropertyAssignment(n.parent) && n.parent.name === n
            ? checker.getShorthandAssignmentValueSymbol(n.parent)
            : checker.getSymbolAtLocation(n)
        if (sym && sym.flags & ts.SymbolFlags.Alias) {
          try {
            sym = checker.getAliasedSymbol(sym)
          } catch {
            // 따라갈 수 없는 별칭은 건너뛴다
          }
        }
        for (const d of sym?.declarations ?? []) {
          const f = d.getSourceFile().fileName
          if (f.includes('node_modules') || !f.startsWith(path.join(FE, 'src'))) continue
          if (f.startsWith(GEN)) {
            const svc = path.basename(path.dirname(f))
            // 생성 파일 맨 위에서 내보낸 함수만 본다. 모듈 자체와 함수 안 변수는 요청 이름이 아니다.
            const topLevel =
              (ts.isFunctionDeclaration(d) && ts.isSourceFile(d.parent)) ||
              (ts.isVariableDeclaration(d) && ts.isSourceFile(d.parent.parent.parent))
            if (path.basename(f) === `${svc}.ts` && topLevel) {
              const op = opOf(ops, svc, sym.name)
              if (op) found.add(op)
              else if (op === undefined) unknownNames.add(`${svc}.${sym.name}`)
            }
            continue
          }
          if (SKIP.test(f) || ts.isSourceFile(d)) continue
          stack.push(d)
        }
      }
      ts.forEachChild(n, walk)
    }
    if (ts.isSourceFile(node)) node.statements.forEach((s) => ts.isImportDeclaration(s) || walk(s))
    else walk(node)
  }
  return found
}

function normalize(route, found, unknown) {
  const calls = new Set()
  for (const raw of found) {
    let call = raw
    if (/^(RAW|TPL) /.test(raw)) {
      const rule = RAW_RULES.find(([re]) => re.test(raw))
      if (!rule) {
        unknown.push(`${route}: ${raw}`)
        continue
      }
      call = rule[1]
    }
    if (!call) continue
    if (COMMON.has(call) && !KEEP_COMMON[call]?.test(route)) continue
    calls.add(call)
  }
  return [...calls].sort()
}

function entries(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      // 가짜 응답 모드 전용 API 경로(app/api)는 화면이 아니다.
      if (p !== path.join(FE, 'src/app/api')) entries(p, acc)
    } else if (e.name === 'page.tsx' || e.name === 'route.ts') acc.push(p)
  }
  return acc
}

const cfgPath = path.join(FE, 'tsconfig.json')
const cfg = ts.parseJsonConfigFileContent(
  ts.readConfigFile(cfgPath, ts.sys.readFile).config,
  ts.sys,
  FE,
)
const program = ts.createProgram(cfg.fileNames, cfg.options)
const checker = program.getTypeChecker()
const ops = loadOps()
const unknown = []
const unknownNames = new Set()
const APP = path.join(FE, 'src/app')
const routes = entries(APP)
  .map((f) => ({ route: routeOf(APP, path.dirname(f)), file: f }))
  .filter((r) => !/^\/(robots|sitemap|manifest)/.test(r.route))
  .sort((a, b) => a.route.localeCompare(b.route))
  .map(({ route, file }) => ({
    route,
    calls: normalize(
      route,
      trace(
        program,
        checker,
        ops,
        [file, ...layoutsOf(APP, path.dirname(file), fs.existsSync)],
        unknownNames,
      ),
      unknown,
    ),
  }))

if (unknownNames.size) {
  console.error('요청 함수 이름을 찾지 못했어요. naming.cjs의 이름 바꾸기 규칙을 고쳐 주세요.')
  for (const n of unknownNames) console.error(`  ${n}`)
  process.exit(1)
}
if (unknown.length) {
  console.error('규칙에 없는 주소 문자열이 있어요. RAW_RULES에 요청인지 아닌지 적어 주세요.')
  for (const u of unknown) console.error(`  ${u}`)
  process.exit(1)
}

const [commit, committedAt] = git(FE, 'log', '-1', '--format=%h %cs').split(' ')
// 커밋하지 않은 프론트 변경이 있으면 기준 커밋과 읽은 코드가 다르다. 페이지에 그 사실을 함께 보여 준다.
const dirty = git(FE, 'status', '--porcelain', '--', '.') !== ''
if (dirty)
  console.warn(
    '프론트에 커밋하지 않은 변경이 있어요. 페이지에 「커밋 안 한 변경 포함」으로 보여요.',
  )
const data = { commit, committedAt, dirty, routes }
fs.writeFileSync(OUT, `${JSON.stringify(data, null, 2)}\n`)
console.log(
  `화면 ${routes.length}개, 요청 ${routes.reduce((n, r) => n + r.calls.length, 0)}건 → ${path.relative(process.cwd(), OUT)}`,
)
