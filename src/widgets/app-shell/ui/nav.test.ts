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
})
