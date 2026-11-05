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

  it('전체 보기에서는 묶음마다 카드 하나를 놓고 머리줄에 티켓 수를 적는다', () => {
    render(<Dashboard snapshot={snapshot([...overdue, ...rest])} now={NOW} />)
    const grid = screen.getByRole('list', { name: '마감 묶음 카드' })
    expect(within(grid).getAllByRole('region')).toHaveLength(5)
    for (const [name, count] of [
      ['기한 지남', 7],
      ['오늘', 1],
      ['이번 주', 1],
      ['그 뒤', 1],
      ['기한 없음', 1],
    ] as const) {
      const card = within(grid).getByRole('region', { name })
      expect(
        within(card).getByRole('button', { name: new RegExp(`^${name}\\s*${count}`) }),
      ).toBeInTheDocument()
    }
    // 카드에는 표를 두지 않는다.
    expect(within(grid).queryByRole('grid')).not.toBeInTheDocument()
  })

  it('카드 한 줄에 번호, 제목, 담당자, 기한을 적고 Linear 이슈로 이어진다', () => {
    render(<Dashboard snapshot={snapshot(rest)} now={NOW} />)
    const card = screen.getByRole('region', { name: '오늘' })
    const item = within(card).getByRole('listitem')
    expect(within(item).getByText('BUK-10')).toBeInTheDocument()
    expect(within(item).getByText('오늘')).toBeInTheDocument()
    expect(within(item).getByText('담당 없음')).toBeInTheDocument()
    const link = within(item).getByRole('link', { name: /티켓 10/ })
    expect(link).toHaveAttribute('href', 'https://linear.app/bukang/issue/BUK-10')
    expect(link).toHaveClass('cursor-pointer')
    expect(within(item).getByTitle('티켓 10')).toHaveClass('truncate')
  })

  it('카드에는 5건까지 보이고, n건 더 보기를 누르면 그 묶음 전체를 표로 보여 준다', async () => {
    render(<Dashboard snapshot={snapshot(overdue)} now={NOW} />)
    const card = screen.getByRole('region', { name: '기한 지남' })
    expect(within(card).getAllByRole('listitem')).toHaveLength(5)
    const more = within(card).getByRole('button', { name: '2건 더 보기' })
    expect(more).toHaveClass('cursor-pointer')

    await userEvent.click(more)
    expect(screen.getByRole('tab', { name: '기한 지남' })).toHaveAttribute('aria-selected', 'true')
    const section = screen.getByRole('region', { name: '기한 지남' })
    expect(within(section).getAllByRole('row')).toHaveLength(1 + 7)
    expect(screen.queryByRole('region', { name: '오늘' })).not.toBeInTheDocument()
  })

  it('5건 이하인 카드는 전체 보기를 두고, 카드 머리줄이나 전체 보기를 누르면 그 묶음 표로 간다', async () => {
    render(<Dashboard snapshot={snapshot(rest)} now={NOW} />)
    const today = screen.getByRole('region', { name: '오늘' })
    expect(within(today).queryByRole('button', { name: /더 보기/ })).not.toBeInTheDocument()
    await userEvent.click(within(today).getByRole('button', { name: '전체 보기' }))
    expect(
      within(screen.getByRole('region', { name: '오늘' })).getByRole('grid'),
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '묶음 선택 풀기' }))
    const later = screen.getByRole('region', { name: '그 뒤' })
    await userEvent.click(within(later).getByRole('button', { name: /^그 뒤\s*1/ }))
    expect(screen.getByRole('tab', { name: '그 뒤' })).toHaveAttribute('aria-selected', 'true')
    expect(
      within(screen.getByRole('region', { name: '그 뒤' })).getByRole('grid'),
    ).toBeInTheDocument()
  })

  it('0건 카드는 없어요만 보여 주고 누를 곳을 두지 않는다', () => {
    render(<Dashboard snapshot={snapshot(rest)} now={NOW} />)
    const card = screen.getByRole('region', { name: '기한 지남' })
    expect(within(card).getByText('없어요')).toBeInTheDocument()
    expect(within(card).getByText('0')).toBeInTheDocument()
    expect(within(card).queryByRole('button')).not.toBeInTheDocument()
    expect(within(card).getByRole('heading', { level: 3, name: /기한 지남/ })).toBeInTheDocument()
  })

  it('묶음을 고르면 카드 대신 그 묶음 표만 보이고, 묶음 선택 풀기로 카드로 돌아온다', async () => {
    render(<Dashboard snapshot={snapshot([...overdue, ...rest])} now={NOW} />)
    expect(screen.queryByRole('button', { name: '묶음 선택 풀기' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: '이번 주' }))
    expect(screen.queryByRole('list', { name: '마감 묶음 카드' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: '기한 지남' })).not.toBeInTheDocument()
    expect(
      within(screen.getByRole('region', { name: '이번 주' })).getByRole('grid'),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '묶음 선택 풀기' }))
    expect(screen.getByRole('tab', { name: '전체' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('list', { name: '마감 묶음 카드' })).toBeInTheDocument()
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

  it('긴 마일스톤 이름은 말줄임 없이 줄바꿈하지 않는 칸에 두고, 라벨과 제목은 잘라도 전체를 마우스 올림 설명으로 남긴다', async () => {
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
    await userEvent.click(screen.getByRole('tab', { name: '이번 주' }))
    const row = screen.getByRole('row', { name: /티켓 30/ })
    const milestone = within(row).getByText(long)
    expect(milestone).not.toHaveClass('truncate')
    expect(milestone.closest('td')).toHaveClass('whitespace-nowrap')
    expect(within(row).getByTitle('아주 긴 라벨 이름입니다')).toHaveClass('truncate')
    expect(within(row).getByRole('link', { name: '티켓 30' })).toHaveAttribute('title', '티켓 30')
    expect(within(row).getByRole('link', { name: '티켓 30' })).toHaveClass('truncate')
  })

  it('묶음마다 표가 달라도 마일스톤 칸 폭을 가장 긴 이름에 맞춰 똑같이 둔다', async () => {
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
    const widthOf = async (name: string) => {
      await userEvent.click(screen.getByRole('tab', { name }))
      return within(screen.getByRole('region', { name })).getByRole('columnheader', {
        name: '마일스톤',
      }).style.width
    }
    const overdueWidth = await widthOf('기한 지남')
    expect(overdueWidth).not.toBe('')
    expect(await widthOf('오늘')).toBe(overdueWidth)
  })

  it('마일스톤 칸이 넓어져도 제목 칸에 240px이 남도록 표를 넓힌다', async () => {
    const long = '아주 긴 마일스톤 이름'.repeat(4)
    render(
      <Dashboard
        snapshot={snapshot([
          issue(33, '2026-11-03', { milestone: { id: 'm9', name: long, progress: 0 } }),
        ])}
        now={NOW}
      />,
    )
    await userEvent.click(screen.getByRole('tab', { name: '기한 지남' }))
    const section = screen.getByRole('region', { name: '기한 지남' })
    const milestone = parseFloat(
      within(section).getByRole('columnheader', { name: '마일스톤' }).style.width,
    )
    // 번호 96 + 담당자 96 + 기한 112 + 라벨 144 = 448
    const table = within(section).getByRole('grid')
    expect(parseFloat(table.style.minWidth)).toBeGreaterThanOrEqual(448 + milestone + 240)
  })

  it('고른 숫자 칸을 다시 누르면 모든 묶음을 다시 보여 준다', async () => {
    render(<Dashboard snapshot={snapshot([...overdue, ...rest])} now={NOW} />)
    const noDue = within(screen.getByRole('group', { name: '숫자 요약' })).getByRole('button', {
      name: /기한 없음\s*1/,
    })
    await userEvent.click(noDue)
    expect(screen.queryByRole('region', { name: '기한 지남' })).not.toBeInTheDocument()
    await userEvent.click(noDue)
    expect(noDue).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('region', { name: '기한 지남' })).toBeInTheDocument()
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

  it('표 한 줄에 기한 표시와 마일스톤 없음, 담당 없음을 적고 Linear 이슈로 이어진다', async () => {
    render(<Dashboard snapshot={snapshot(rest)} now={NOW} />)
    await userEvent.click(screen.getByRole('tab', { name: '오늘' }))
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
    const row = within(screen.getByRole('region', { name: '이번 주' })).getByRole('listitem')
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
