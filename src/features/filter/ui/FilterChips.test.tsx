import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Issue } from '@/shared/api/linear'

import { FilterChips } from './FilterChips'

const replace = vi.fn()
let search = ''
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/cycles',
  useSearchParams: () => new URLSearchParams(search),
}))

const issue: Issue = {
  id: 'i1',
  identifier: 'BUK-1',
  title: '티켓',
  url: 'https://linear.app/x/issue/BUK-1',
  dueDate: null,
  startedAt: null,
  state: { name: '할 일', type: 'unstarted' },
  assignee: { id: 'u1', name: '지훈' },
  labels: [{ id: 'l1', name: 'Feature' }],
  milestone: null,
}

describe('고른 필터 조건 칩', () => {
  beforeEach(() => {
    search = ''
    replace.mockReset()
  })

  it('걸린 조건이 없으면 아무것도 보여 주지 않는다', () => {
    const { container } = render(<FilterChips issues={[issue]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('조건마다 이름을 뜻으로 적은 칩을 보여 준다', () => {
    search = 'assignee=u1&label=l1&milestone=none'
    render(<FilterChips issues={[issue]} />)
    expect(screen.getByText('담당자: 지훈')).toBeInTheDocument()
    expect(screen.getByText('라벨: Feature')).toBeInTheDocument()
    expect(screen.getByText('마일스톤: 마일스톤 없음')).toBeInTheDocument()
  })

  it('칩의 지우기 버튼을 누르면 그 조건만 빠지고 페이지는 그대로다', async () => {
    search = 'assignee=u1&milestone=none'
    render(<FilterChips issues={[issue]} />)
    await userEvent.click(screen.getByRole('button', { name: '담당자 조건 지우기' }))
    expect(replace).toHaveBeenCalledWith('/cycles?milestone=none', { scroll: false })
  })

  it('받아 둔 티켓에 없는 값이 주소에 있으면 id 대신 「알 수 없음」으로 적는다', () => {
    search = 'assignee=gone'
    render(<FilterChips issues={[issue]} />)
    expect(screen.getByText('담당자: 알 수 없음')).toBeInTheDocument()
  })
})
