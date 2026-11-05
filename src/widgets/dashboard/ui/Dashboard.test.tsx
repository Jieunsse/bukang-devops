import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Issue, Snapshot } from '@/shared/api/linear'

import { useDashboardStore } from '../model/store'
import { Dashboard } from './Dashboard'

const replace = vi.fn()
let search = ''
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(search),
}))

const issue = (n: number, dueDate: string | null, extra: Partial<Issue> = {}): Issue => ({
  id: `i${n}`,
  identifier: `BUK-${n}`,
  title: `티켓 ${n}`,
  url: `https://linear.app/bukang/issue/BUK-${n}`,
  dueDate,
  startedAt: null,
  state: { name: '할 일', type: 'unstarted' },
  assignee: { id: 'u1', name: '지훈' },
  labels: [{ id: 'l1', name: '프론트' }],
  milestone: null,
  ...extra,
})

// 한국 시간 2026-11-05(목). 사이클이 없어 이번 주는 11/8(일)까지다.
const NOW = new Date('2026-11-05T03:00:00.000Z').getTime()
const snapshot = (issues: Issue[]): Snapshot => ({
  fetchedAt: '2026-11-05T02:55:00.000Z',
  cycles: [],
  issues,
})

const overdue = Array.from({ length: 7 }, (_, n) => issue(n + 1, '2026-11-03'))
const rest = [
  issue(10, '2026-11-05', { assignee: null }),
  issue(11, '2026-11-07', { milestone: { id: 'm1', name: '세미 발표', progress: 0.5 } }),
  issue(12, '2026-11-20'),
  issue(13, null),
]

describe('대시보드', () => {
  beforeEach(() => {
    search = ''
    replace.mockReset()
    useDashboardStore.setState({ bucket: 'all', date: null })
  })

  it('숫자 요약 네 칸에 묶음별 티켓 수를 보여 준다', () => {
    render(<Dashboard snapshot={snapshot([...overdue, ...rest])} now={NOW} />)
    const summary = screen.getByRole('group', { name: '숫자 요약' })
    expect(within(summary).getByRole('button', { name: /기한 지남\s*7/ })).toBeInTheDocument()
    expect(within(summary).getByRole('button', { name: /오늘\s*1/ })).toBeInTheDocument()
    expect(within(summary).getByRole('button', { name: /이번 주\s*1/ })).toBeInTheDocument()
    expect(within(summary).getByRole('button', { name: /기한 없음\s*1/ })).toBeInTheDocument()
  })

  it('묶음마다 5개까지 보여 주고 나머지는 더 보기로 연다', async () => {
    render(<Dashboard snapshot={snapshot(overdue)} now={NOW} />)
    const section = screen.getByRole('region', { name: '기한 지남' })
    expect(within(section).getAllByRole('row')).toHaveLength(1 + 5)
    await userEvent.click(within(section).getByRole('button', { name: '2건 더 보기' }))
    expect(within(section).getAllByRole('row')).toHaveLength(1 + 7)
  })

  it('그 뒤와 기한 없음은 접혀 있다', () => {
    render(<Dashboard snapshot={snapshot(rest)} now={NOW} />)
    expect(screen.queryByText('티켓 12')).not.toBeInTheDocument()
    expect(screen.queryByText('티켓 13')).not.toBeInTheDocument()
    expect(screen.getByText('티켓 11')).toBeInTheDocument()
  })

  it('접힌 묶음은 머리줄 전체가 버튼이라 누르면 펼치고 다시 누르면 접는다', async () => {
    render(<Dashboard snapshot={snapshot(rest)} now={NOW} />)
    const header = screen.getByRole('button', { name: /그 뒤\s*1/ })
    expect(header).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('button', { name: '펼치기' })).not.toBeInTheDocument()

    await userEvent.click(header)
    expect(header).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('티켓 12')).toBeInTheDocument()

    await userEvent.click(header)
    expect(screen.queryByText('티켓 12')).not.toBeInTheDocument()
  })

  it('모든 묶음 머리줄이 버튼이라 기한 지남·오늘·이번 주도 누르면 접고 다시 누르면 펼친다', async () => {
    render(<Dashboard snapshot={snapshot([...overdue, ...rest])} now={NOW} />)
    for (const name of ['기한 지남', '오늘', '이번 주']) {
      const section = screen.getByRole('region', { name })
      const header = within(section).getByRole('button', { name: new RegExp(`^${name}`) })
      expect(header).toHaveAttribute('aria-expanded', 'true')
      expect(within(section).getByRole('grid')).toBeInTheDocument()

      await userEvent.click(header)
      expect(header).toHaveAttribute('aria-expanded', 'false')
      expect(within(section).queryByRole('grid')).not.toBeInTheDocument()

      await userEvent.click(header)
      expect(within(section).getByRole('grid')).toBeInTheDocument()
    }
  })

  it('티켓이 0건인 묶음은 누를 수 없고 0은 그대로 보여 준다', () => {
    render(<Dashboard snapshot={snapshot(rest)} now={NOW} />)
    const section = screen.getByRole('region', { name: '기한 지남' })
    expect(within(section).queryByRole('button')).not.toBeInTheDocument()
    expect(within(section).getByText('0')).toBeInTheDocument()
    expect(
      within(section).getByRole('heading', { level: 3, name: /기한 지남/ }),
    ).toBeInTheDocument()
  })

  it('키보드 Enter와 Space로 묶음을 접고 펼친다', async () => {
    render(<Dashboard snapshot={snapshot(rest)} now={NOW} />)
    const section = screen.getByRole('region', { name: '오늘' })
    const header = within(section).getByRole('button', { name: /^오늘/ })
    header.focus()
    await userEvent.keyboard('{Enter}')
    expect(header).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('티켓 10')).not.toBeInTheDocument()
    await userEvent.keyboard(' ')
    expect(header).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('티켓 10')).toBeInTheDocument()
  })

  it('접었다 펼쳐도 더 보기로 연 줄이 남고, 접으면 더 보기 버튼도 숨긴다', async () => {
    render(<Dashboard snapshot={snapshot(overdue)} now={NOW} />)
    const section = screen.getByRole('region', { name: '기한 지남' })
    const header = within(section).getByRole('button', { name: /^기한 지남/ })

    await userEvent.click(header)
    expect(within(section).queryByRole('button', { name: '2건 더 보기' })).not.toBeInTheDocument()
    await userEvent.click(header)
    await userEvent.click(within(section).getByRole('button', { name: '2건 더 보기' }))
    await userEvent.click(header)
    await userEvent.click(header)
    expect(within(section).getAllByRole('row')).toHaveLength(1 + 7)
  })

  it('탭으로 묶음 하나만 고르면 펼친 채로 보여 주고 접기 버튼을 두지 않는다', async () => {
    render(<Dashboard snapshot={snapshot(rest)} now={NOW} />)
    await userEvent.click(screen.getByRole('tab', { name: '그 뒤' }))
    const section = screen.getByRole('region', { name: '그 뒤' })
    expect(within(section).queryByRole('button', { name: /^그 뒤/ })).not.toBeInTheDocument()
    expect(screen.getByText('티켓 12')).toBeInTheDocument()
  })

  it('달력에서 날짜를 고르면 펼친 채로 보여 주고 접기 버튼을 두지 않는다', async () => {
    render(<Dashboard snapshot={snapshot(rest)} now={NOW} />)
    const calendar = screen.getByRole('application', { name: /^기한 달력/ })
    await userEvent.click(within(calendar).getByRole('button', { name: /11월 7일/ }))
    const section = screen.getByRole('region', { name: '11/7 기한' })
    expect(within(section).queryByRole('button', { name: /^11\/7 기한/ })).not.toBeInTheDocument()
    expect(screen.getByText('티켓 11')).toBeInTheDocument()
  })

  it('묶음을 바꿨다 돌아오면 접은 상태를 처음으로 돌린다', async () => {
    render(<Dashboard snapshot={snapshot(rest)} now={NOW} />)
    await userEvent.click(
      within(screen.getByRole('region', { name: '오늘' })).getByRole('button', { name: /^오늘/ }),
    )
    expect(screen.queryByText('티켓 10')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: '이번 주' }))
    await userEvent.click(screen.getByRole('tab', { name: '전체' }))
    expect(screen.getByText('티켓 10')).toBeInTheDocument()
  })

  it('전체 보기에서 접은 묶음을 탭으로 고르면 펼친 채로 보여 준다', async () => {
    render(<Dashboard snapshot={snapshot(rest)} now={NOW} />)
    await userEvent.click(
      within(screen.getByRole('region', { name: '오늘' })).getByRole('button', { name: /^오늘/ }),
    )
    expect(screen.queryByText('티켓 10')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: '오늘' }))
    expect(screen.getByText('티켓 10')).toBeInTheDocument()
  })

  it('긴 마일스톤 이름은 말줄임 없이 줄바꿈하지 않는 칸에 두고, 라벨과 제목은 잘라도 전체를 마우스 올림 설명으로 남긴다', () => {
    const long = '충전 한도·이상 감지와 아주 긴 마일스톤 이름'
    render(
      <Dashboard
        snapshot={snapshot([
          issue(30, '2026-11-07', {
            milestone: { id: 'm9', name: long, progress: 0 },
            labels: [{ id: 'l9', name: '아주 긴 라벨 이름입니다' }],
          }),
        ])}
        now={NOW}
      />,
    )
    const row = screen.getByRole('row', { name: /티켓 30/ })
    const milestone = within(row).getByText(long)
    expect(milestone).not.toHaveClass('truncate')
    expect(milestone.closest('td')).toHaveClass('whitespace-nowrap')
    expect(within(row).getByTitle('아주 긴 라벨 이름입니다')).toHaveClass('truncate')
    expect(within(row).getByRole('link', { name: '티켓 30' })).toHaveAttribute('title', '티켓 30')
    expect(within(row).getByRole('link', { name: '티켓 30' })).toHaveClass('truncate')
  })

  it('묶음마다 표가 달라도 마일스톤 칸 폭을 가장 긴 이름에 맞춰 똑같이 둔다', () => {
    const long = '충전 한도·이상 감지와 아주 긴 마일스톤 이름'
    render(
      <Dashboard
        snapshot={snapshot([
          issue(31, '2026-11-03', { milestone: { id: 'm9', name: long, progress: 0 } }),
          issue(32, '2026-11-05'),
        ])}
        now={NOW}
      />,
    )
    const widthOf = (name: string) =>
      within(screen.getByRole('region', { name })).getByRole('columnheader', { name: '마일스톤' })
        .style.width
    expect(widthOf('기한 지남')).not.toBe('')
    expect(widthOf('오늘')).toBe(widthOf('기한 지남'))
  })

  it('마일스톤 칸이 넓어져도 제목 칸에 240px이 남도록 표를 넓힌다', () => {
    const long = '아주 긴 마일스톤 이름'.repeat(4)
    render(
      <Dashboard
        snapshot={snapshot([
          issue(33, '2026-11-03', { milestone: { id: 'm9', name: long, progress: 0 } }),
        ])}
        now={NOW}
      />,
    )
    const section = screen.getByRole('region', { name: '기한 지남' })
    const milestone = parseFloat(
      within(section).getByRole('columnheader', { name: '마일스톤' }).style.width,
    )
    // 번호 96 + 담당자 96 + 기한 112 + 라벨 144 = 448
    const table = within(section).getByRole('grid')
    expect(parseFloat(table.style.minWidth)).toBeGreaterThanOrEqual(448 + milestone + 240)
  })

  it('숫자 칸을 누르면 마감 목록이 그 묶음만 보여 준다', async () => {
    render(<Dashboard snapshot={snapshot([...overdue, ...rest])} now={NOW} />)
    await userEvent.click(
      within(screen.getByRole('group', { name: '숫자 요약' })).getByRole('button', {
        name: /기한 없음\s*1/,
      }),
    )
    expect(screen.queryByRole('region', { name: '기한 지남' })).not.toBeInTheDocument()
    expect(screen.getByText('티켓 13')).toBeInTheDocument()
  })

  it('한 줄에 기한 표시와 마일스톤 없음, 담당 없음을 적고 Linear 이슈로 이어진다', () => {
    render(<Dashboard snapshot={snapshot(rest)} now={NOW} />)
    const row = screen.getByRole('row', { name: /티켓 10/ })
    expect(within(row).getByText('오늘')).toBeInTheDocument()
    expect(within(row).getByText('담당 없음')).toBeInTheDocument()
    expect(within(row).getByText('마일스톤 없음')).toBeInTheDocument()
    expect(within(row).getByText('BUK-10')).toBeInTheDocument()
    expect(within(row).getByRole('link', { name: /티켓 10/ })).toHaveAttribute(
      'href',
      'https://linear.app/bukang/issue/BUK-10',
    )
  })

  it('프로필 이미지가 없는 담당자는 이름 첫 글자로 보여 준다', () => {
    render(<Dashboard snapshot={snapshot([issue(20, '2026-11-07')])} now={NOW} />)
    const row = screen.getByRole('row', { name: /티켓 20/ })
    expect(within(row).getByText('지')).toBeInTheDocument()
    expect(within(row).getByText('지훈')).toBeInTheDocument()
  })

  it('맨 위에 최종 발표, 지금 사이클, 남은 일의 속도 카드 세 개를 보여 준다', () => {
    render(<Dashboard snapshot={snapshot(rest)} now={NOW} />)
    const summary = screen.getByRole('region', { name: '한눈에 보기' })
    expect(within(summary).getByText('최종 발표 11/23(월)')).toBeInTheDocument()
    expect(within(summary).getByText('D-18')).toBeInTheDocument()
    expect(within(summary).getByText('사이클 밖 · 11/5~11/8')).toBeInTheDocument()
    // 끝나지 않은 티켓 4건 ÷ 발표까지 18일 = 0.2건
    expect(within(summary).getByText('0.2건')).toBeInTheDocument()
    expect(within(summary).getByText('끝나지 않은 티켓 4건 · 발표까지 18일')).toBeInTheDocument()
  })

  it('달력 날짜에 기한 티켓 수를 적고, 날짜를 누르면 그날 티켓만 보이고 다시 누르면 풀린다', async () => {
    render(<Dashboard snapshot={snapshot([...overdue, ...rest])} now={NOW} />)
    const calendar = screen.getByRole('application', { name: /^기한 달력/ })
    const day7 = within(calendar).getByRole('button', { name: /11월 7일/ })
    expect(within(day7).getByText('1')).toBeInTheDocument()

    await userEvent.click(day7)
    expect(screen.getByRole('region', { name: '11/7 기한' })).toBeInTheDocument()
    expect(screen.getByText('티켓 11')).toBeInTheDocument()
    expect(screen.queryByText('티켓 1')).not.toBeInTheDocument()

    await userEvent.click(within(calendar).getByRole('button', { name: /11월 7일/ }))
    expect(screen.queryByRole('region', { name: '11/7 기한' })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: '기한 지남' })).toBeInTheDocument()
  })

  it('주소의 필터를 적용한다', () => {
    search = 'assignee=none'
    render(<Dashboard snapshot={snapshot(rest)} now={NOW} />)
    expect(screen.getByText('티켓 10')).toBeInTheDocument()
    expect(screen.queryByText('티켓 11')).not.toBeInTheDocument()
  })

  it('사람별 막대를 누르면 그 사람으로 필터를 건다', async () => {
    render(<Dashboard snapshot={snapshot(rest)} now={NOW} />)
    await userEvent.click(screen.getByRole('button', { name: /담당 없음 1건/ }))
    expect(replace).toHaveBeenCalledWith('/?assignee=none', { scroll: false })
  })

  it('마일스톤을 누르면 그 마일스톤으로 필터를 건다', async () => {
    render(<Dashboard snapshot={snapshot(rest)} now={NOW} />)
    await userEvent.click(screen.getByRole('button', { name: /세미 발표/ }))
    expect(replace).toHaveBeenCalledWith('/?milestone=m1', { scroll: false })
  })

  it('고른 묶음에 티켓이 없으면 그 묶음의 빈 안내를 보여 준다', async () => {
    render(<Dashboard snapshot={snapshot(overdue)} now={NOW} />)
    await userEvent.click(screen.getByRole('button', { name: /오늘\s*0/ }))
    expect(screen.getByText('이 묶음에 남은 티켓이 없어요')).toBeInTheDocument()
  })

  it('이미 걸린 담당자를 다시 누르면 그 필터를 푼다', async () => {
    search = 'assignee=none&label=l1'
    render(<Dashboard snapshot={snapshot([issue(10, null, { assignee: null })])} now={NOW} />)
    await userEvent.click(screen.getByRole('button', { name: /담당 없음 1건/ }))
    expect(replace).toHaveBeenCalledWith('/?label=l1', { scroll: false })
  })

  it('티켓이 하나도 없으면 빈 안내를 보여 준다', () => {
    render(<Dashboard snapshot={snapshot([])} now={NOW} />)
    expect(screen.getByText('남은 티켓이 없어요')).toBeInTheDocument()
  })
})
