import { describe, expect, it } from 'vitest'

import {
  apiRows,
  FLOW_DATA,
  matches,
  parseCall,
  screenGroups,
  serviceOf,
  unmatchedRoutes,
} from './flow'

describe('API 흐름', () => {
  it('추출한 화면 주소와 screens.ts의 화면 이름이 하나하나 맞는다', () => {
    // 실패하면 프론트에 화면이 생기거나 없어진 것이다. screens.ts를 고친다.
    expect(unmatchedRoutes()).toEqual({ unnamed: [], missing: [] })
  })

  it('화면 주소는 한 묶음에만 있다', () => {
    const routes = screenGroups().flatMap((g) => g.rows.map((r) => r.route))
    expect(new Set(routes).size).toBe(routes.length)
  })

  it('게이트웨이 규칙대로 서비스를 고른다', () => {
    expect(serviceOf('/api/v1/auth/login')).toBe('회원')
    expect(serviceOf('/api/v1/member/crews/me')).toBe('회원')
    expect(serviceOf('/api/v1/cash/wallets/balance')).toBe('예치금')
    expect(serviceOf('/admin/stats/data?section={구역}')).toBe('Next 서버')
    expect(serviceOf('/api/v2/unknown')).toBe('알 수 없음')
  })

  it('모든 요청이 아는 서비스로 간다', () => {
    const unknown = apiRows().filter((r) => r.service === '알 수 없음')
    expect(unknown.map((r) => r.key)).toEqual([])
  })

  it('요청을 메서드와 주소로 나누고 설명을 붙인다', () => {
    expect(parseCall('POST /api/v1/auth/identity-verifications/pass')).toEqual({
      key: 'POST /api/v1/auth/identity-verifications/pass',
      method: 'POST',
      path: '/api/v1/auth/identity-verifications/pass',
      service: '회원',
      note: '가짜 응답 모드 전용',
    })
  })

  it('화면 안 요청은 GET → POST → PUT → PATCH → DELETE 순서다', () => {
    const flow = {
      ...FLOW_DATA,
      routes: [{ route: '/x', calls: ['DELETE /api/v1/a', 'GET /api/v1/b', 'POST /api/v1/a'] }],
    }
    const groups = [{ id: 'x', title: 'x', description: '', screens: [{ route: '/x', name: 'x' }] }]
    expect(screenGroups(flow, groups)[0]?.rows[0]?.calls.map((c) => c.method)).toEqual([
      'GET',
      'POST',
      'DELETE',
    ])
  })

  it('API별 보기는 같은 요청을 보내는 화면을 모은다', () => {
    const flow = {
      ...FLOW_DATA,
      routes: [
        { route: '/a', calls: ['GET /api/v1/cash/wallets/balance'] },
        {
          route: '/b',
          calls: ['GET /api/v1/cash/wallets/balance', 'GET /api/v1/member/members/me'],
        },
      ],
    }
    const groups = [
      { id: 'x', title: 'x', description: '', screens: [{ route: '/a', name: '가' }] },
    ]
    expect(apiRows(flow, groups).map((r) => [r.key, r.screens.map((s) => s.name)])).toEqual([
      ['GET /api/v1/cash/wallets/balance', ['가', '/b']],
      ['GET /api/v1/member/members/me', ['/b']],
    ])
  })

  it('검색은 대소문자를 가리지 않고, 빈 검색어는 모두 남긴다', () => {
    expect(matches('WALLETS', '/api/v1/cash/wallets/balance')).toBe(true)
    expect(matches('crews', '/api/v1/cash/wallets/balance', '/me')).toBe(false)
    expect(matches('  ', 'x')).toBe(true)
  })
})
