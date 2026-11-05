import { describe, expect, it } from 'vitest'

import robots from './robots'

describe('robots.txt', () => {
  it('모든 검색엔진의 수집을 막는다', () => {
    expect(robots()).toEqual({ rules: { userAgent: '*', disallow: '/' } })
  })
})
