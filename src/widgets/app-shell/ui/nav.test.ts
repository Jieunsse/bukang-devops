import { describe, expect, it } from 'vitest'

import { NAV_ITEMS } from './nav'

describe('메뉴', () => {
  it('달력 페이지로 가는 메뉴가 있다', () => {
    expect(NAV_ITEMS.some((i) => i.href === '/calendar' && i.label === '달력')).toBe(true)
  })

  it('작업 요청 페이지로 가는 메뉴가 있다', () => {
    expect(NAV_ITEMS.some((i) => i.href === '/request' && i.label === '작업 요청')).toBe(true)
  })

  it('DB 구조 페이지로 가는 메뉴가 있다', () => {
    expect(NAV_ITEMS.some((i) => i.href === '/db' && i.label === 'DB 구조')).toBe(true)
  })

  it('아키텍처 페이지로 가는 메뉴가 있다', () => {
    expect(NAV_ITEMS.some((i) => i.href === '/architecture' && i.label === '아키텍처')).toBe(true)
  })

  it('이용 통계 페이지로 가는 메뉴가 있다', () => {
    expect(NAV_ITEMS.some((i) => i.href === '/analytics' && i.label === '이용 통계')).toBe(true)
  })

  it('성능 측정 페이지로 가는 메뉴가 있다', () => {
    expect(NAV_ITEMS.some((i) => i.href === '/performance' && i.label === '성능 측정')).toBe(true)
  })

  it('링크 모음 페이지로 가는 메뉴가 있다', () => {
    expect(NAV_ITEMS.some((i) => i.href === '/links' && i.label === '링크 모음')).toBe(true)
  })

  it('모니터링 페이지로 가는 메뉴가 있다', () => {
    expect(NAV_ITEMS.some((i) => i.href === '/monitoring' && i.label === '모니터링')).toBe(true)
  })
})

describe('메뉴 묶음', () => {
  it('맨 위는 대시보드·달력·모니터링, 그룹 세 개가 정한 순서이고 메뉴 13개가 모두 있다', async () => {
    const { NAV_TOP, NAV_GROUPS } = await import('./nav')
    expect(NAV_TOP.map((i) => i.label)).toEqual(['대시보드', '달력', '모니터링'])
    expect(NAV_GROUPS.map((g) => [g.label, g.items.map((i) => i.label)])).toEqual([
      ['일정·작업', ['사이클', '타임라인', '완료·취소', '작업 요청']],
      ['설계 문서', ['API 명세', 'DB 구조', '아키텍처']],
      ['측정·기타', ['이용 통계', '성능 측정', '링크 모음']],
    ])
    expect(new Set(NAV_ITEMS.map((i) => i.href)).size).toBe(13)
  })

  it('하위 주소도 그 메뉴로 본다(대시보드는 맨 앞 주소만)', async () => {
    const { isCurrentPath } = await import('./nav')
    expect(isCurrentPath('/monitoring/rYdddlPWk', '/monitoring')).toBe(true)
    expect(isCurrentPath('/monitoring', '/monitoring')).toBe(true)
    expect(isCurrentPath('/monitoring', '/')).toBe(false)
    expect(isCurrentPath('/', '/')).toBe(true)
    expect(isCurrentPath('/db', '/done')).toBe(false)
  })
})
