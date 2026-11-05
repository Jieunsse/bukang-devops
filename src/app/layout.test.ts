import { describe, expect, it } from 'vitest'

import { metadata } from './layout'

describe('링크 미리보기 정보', () => {
  it('제목·설명·주소를 미리보기와 트위터 카드에 넣고 검색 수집은 계속 막는다', () => {
    const description = '크루런 팀 티켓의 기한과 일정을 한눈에 보는 대시보드'
    expect(metadata.title).toBe('bukang-devops')
    expect(metadata.description).toBe(description)
    expect(String(metadata.metadataBase)).toBe('https://bukang-devops.vercel.app/')
    expect(metadata.openGraph).toMatchObject({
      title: 'bukang-devops',
      description,
      locale: 'ko_KR',
    })
    expect(metadata.twitter).toMatchObject({
      card: 'summary_large_image',
      title: 'bukang-devops',
      description,
    })
    expect(metadata.robots).toEqual({ index: false, follow: false })
  })
})
