import { describe, expect, it } from 'vitest'

import { NAV_ITEMS } from './nav'

describe('메뉴', () => {
  it('달력 페이지로 가는 메뉴가 있다', () => {
    expect(NAV_ITEMS.some((i) => i.href === '/calendar' && i.label === '달력')).toBe(true)
  })
})
