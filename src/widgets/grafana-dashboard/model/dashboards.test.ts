import { describe, expect, it } from 'vitest'

import { toDashboardLinks } from './dashboards'

describe('모니터링 탭', () => {
  it('알려진 대시보드는 정한 순서와 이름으로, 모르는 대시보드는 뒤에 원래 이름으로 둔다', () => {
    const links = toDashboardLinks([
      { uid: 'new', title: 'New Board' },
      { uid: '549c2bf8936f7767ea6ac47c47b00f2a', title: 'MySQL Exporter' },
      { uid: 'rYdddlPWk', title: 'Node Exporter Full' },
    ])
    expect(links.map((l) => l.name)).toEqual(['서버', 'MySQL', 'New Board'])
  })
})
