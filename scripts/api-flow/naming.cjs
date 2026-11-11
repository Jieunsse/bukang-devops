// extract.cjs가 쓰는 이름 · 주소 변환. 테스트(naming.test.ts)에서 따로 확인하려고 나눴다.
const path = require('path')

// orval이 요청 함수 이름에 덧붙이는 앞뒤 말. 이름 그대로 먼저 찾고, 없을 때만 떼어 본다.
const PREFIXES = [/^use(?=[A-Z])/, /^get(?=[A-Z])/]
const SUFFIXES = [/(QueryOptions|MutationOptions|Url)$/, /(Suspense)?(Infinite)?$/]
// 요청이 아니라 캐시 키 · 타입 도우미라서 세지 않는 이름
const NOT_REQUEST =
  /(QueryKey|MutationKey|QueryResult|QueryError|MutationResult|MutationBody|MutationError)$/

/**
 * 생성 파일의 이름(useFindMe, getFindMeQueryOptions, useFindMeSuspense 등)을 요청 함수 이름(findMe)으로 바꿔 ops에서 찾는다.
 * 요청이 아닌 이름이면 null, 요청 같은데 못 찾으면 undefined를 돌려준다.
 */
function opOf(ops, svc, name) {
  if (NOT_REQUEST.test(name)) return null
  const tried = new Set()
  const candidates = [name]
  for (const pre of [null, ...PREFIXES]) {
    let n = pre ? name.replace(pre, '') : name
    for (const suf of SUFFIXES) n = n.replace(suf, '')
    candidates.push(n, pre ? name.replace(pre, '') : name)
  }
  for (const c of candidates) {
    const key = `${svc}:${c[0]?.toLowerCase()}${c.slice(1)}`
    if (tried.has(key)) continue
    tried.add(key)
    if (ops[key]) return ops[key]
  }
  return undefined
}

/** app 폴더 안 경로를 화면 주소로 바꾼다. (묶음) 폴더는 빼고 [id]는 {id}로 쓴다. */
function routeOf(appDir, dir) {
  const parts = path
    .relative(appDir, dir)
    .split(path.sep)
    .filter((p) => p && !/^\(.*\)$/.test(p))
    .map((p) => p.replace(/^\[(\w+)\]$/, '{$1}'))
  return `/${parts.join('/')}`
}

/** 화면 폴더에서 app 폴더까지 올라가며 묶음 레이아웃(layout.tsx)을 모은다. 맨 위 layout.tsx는 모든 화면 공통이라 뺀다. */
function layoutsOf(appDir, dir, exists) {
  const found = []
  for (let d = dir; d !== appDir && d.startsWith(appDir); d = path.dirname(d)) {
    const f = path.join(d, 'layout.tsx')
    if (exists(f)) found.push(f)
  }
  return found
}

module.exports = { opOf, routeOf, layoutsOf }
