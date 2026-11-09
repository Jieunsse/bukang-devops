import { describe, expect, it } from 'vitest'

import { stateLabel } from './state'

describe('상태 이름', () => {
  it('Linear 상태 이름을 뜻으로 바꾼다', () => {
    expect(stateLabel({ name: 'Backlog' })).toBe('대기')
    expect(stateLabel({ name: 'Todo' })).toBe('할 일')
    expect(stateLabel({ name: 'In Progress' })).toBe('진행 중')
    expect(stateLabel({ name: 'In Review' })).toBe('리뷰 중')
    expect(stateLabel({ name: 'Done' })).toBe('완료')
    expect(stateLabel({ name: 'Canceled' })).toBe('취소')
  })

  it('모르는 상태 이름은 받은 그대로 보여 준다', () => {
    expect(stateLabel({ name: 'QA' })).toBe('QA')
  })
})
