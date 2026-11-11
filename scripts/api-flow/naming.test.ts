import { describe, expect, it } from 'vitest'

import naming from './naming.cjs'

const { opOf, routeOf, layoutsOf } = naming as {
  opOf: (ops: Record<string, string>, svc: string, name: string) => string | null | undefined
  routeOf: (appDir: string, dir: string) => string
  layoutsOf: (appDir: string, dir: string, exists: (f: string) => boolean) => string[]
}

const ops = {
  'member:findMe': 'GET /api/v1/member/members/me',
  'member:useCoupon': 'POST /api/v1/member/coupons/use',
  'order:findMine': 'GET /api/v1/order/orders',
}

describe('요청 함수 이름 바꾸기', () => {
  it('orval이 만드는 이름을 요청 함수로 찾는다', () => {
    for (const name of [
      'findMe',
      'useFindMe',
      'getFindMeUrl',
      'getFindMeQueryOptions',
      'useFindMeSuspense',
      'useFindMeInfinite',
      'useFindMeSuspenseInfinite',
      'getFindMeSuspenseQueryOptions',
      'getFindMeInfiniteQueryOptions',
    ]) {
      expect(opOf(ops, 'member', name), name).toBe('GET /api/v1/member/members/me')
    }
  })

  it('use로 시작하는 요청 함수는 이름 그대로 먼저 찾는다', () => {
    expect(opOf(ops, 'member', 'useCoupon')).toBe('POST /api/v1/member/coupons/use')
    expect(opOf(ops, 'member', 'useUseCoupon')).toBe('POST /api/v1/member/coupons/use')
  })

  it('같은 이름도 서비스별로 따로 찾는다', () => {
    expect(opOf(ops, 'order', 'useFindMine')).toBe('GET /api/v1/order/orders')
    expect(opOf(ops, 'member', 'useFindMine')).toBeUndefined()
  })

  it('캐시 키와 타입 도우미는 요청이 아니다', () => {
    expect(opOf(ops, 'member', 'getFindMeQueryKey')).toBeNull()
    expect(opOf(ops, 'member', 'getFindMeMutationKey')).toBeNull()
    expect(opOf(ops, 'member', 'FindMeQueryResult')).toBeNull()
  })
})

describe('화면 주소 바꾸기', () => {
  it('(묶음) 폴더는 빼고 [id]는 {id}로 쓴다', () => {
    expect(routeOf('/app', '/app/(shop)/(home)')).toBe('/')
    expect(routeOf('/app', '/app/(shop)/races/[raceId]/apply')).toBe('/races/{raceId}/apply')
  })

  it('묶음 레이아웃은 모으고 맨 위 레이아웃은 뺀다', () => {
    const files = new Set(['/app/layout.tsx', '/app/(admin)/layout.tsx'])
    expect(layoutsOf('/app', '/app/(admin)/admin/holds', (f) => files.has(f))).toEqual([
      '/app/(admin)/layout.tsx',
    ])
  })
})
