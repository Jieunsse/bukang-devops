import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Cycle, Issue, Snapshot } from '@/shared/api/linear'

import { MonthCalendar } from './MonthCalendar'

let search = ''
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/calendar',
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

// 한국 시간 2026-11-05(목) 12시
const NOW = new Date('2026-11-05T03:00:00.000Z').getTime()
const snapshot = (issues: Issue[], cycles: Cycle[] = []): Snapshot => ({
  fetchedAt: '2026-11-05T02:55:00.000Z',
  cycles,
  issues,
})
/** 기한 색이 붙는 이슈 번호 글자 */
const number = (identifier: string, scope: HTMLElement = document.body) =>
  within(scope).getByText(identifier)

/** 휴대폰처럼 마우스를 올릴 수 없는 기기로 바꾼다. */
const useTouchDevice = () => {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  })
}

// 칸 이름은 「11월 12일 목요일」이다. 요일까지 맞추는 테스트는 따로 둔다.
const day = (name: string) => screen.getByRole('listitem', { name: new RegExp(`^${name} `) })

describe('달력 페이지', () => {
  beforeEach(() => {
    search = ''
  })
  afterEach(() => {
    // jsdom에는 matchMedia가 없다. 없으면 마우스를 쓰는 기기로 본다.
    delete (window as { matchMedia?: unknown }).matchMedia
  })

  it('달력 위 도구 줄에 넘겨받은 버튼을 둔다', () => {
    render(
      <MonthCalendar
        snapshot={snapshot([issue(1, '2026-11-12')])}
        now={NOW}
        actions={<button>필터</button>}
      />,
    )
    const bar = screen.getByRole('group', { name: '달력 도구' })
    expect(within(bar).getByRole('button', { name: '필터' })).toBeInTheDocument()
  })

  it('오늘이 든 달을 열고, 날짜 칸 한 줄에 「프로필 + 담당자 이름 + 이슈 번호」를 Linear 링크로 보여 준다', () => {
    render(
      <MonthCalendar
        snapshot={snapshot([
          issue(1, '2026-11-12', {
            assignee: { id: 'u1', name: '지훈', avatarUrl: 'https://example.com/a.png' },
          }),
        ])}
        now={NOW}
      />,
    )
    expect(screen.getByRole('heading', { name: '2026년 11월' })).toBeInTheDocument()
    const cell = day('11월 12일')
    const link = within(cell).getByRole('link', { name: /BUK-1 티켓 1/ })
    expect(link).toHaveAttribute('href', 'https://linear.app/bukang/issue/BUK-1')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.className).toMatch(/cursor-pointer/)
    expect(within(link).getByText('지훈').className).toMatch(/truncate/)
    expect(within(link).getByText('BUK-1')).toBeInTheDocument()
    // 프로필은 공통 프로필 컴포넌트(얇은 테두리)를 쓴다.
    expect(link.querySelector('.ring-1.ring-border')).not.toBeNull()
    // 제목은 줄에 적지 않는다. 화면 낭독기용 이름에만 남긴다.
    expect(within(cell).queryByText(/티켓 1/)).not.toBeInTheDocument()
  })

  it('담당자 없는 티켓은 회색 기본 아이콘과 「담당 없음」으로 적는다', () => {
    render(
      <MonthCalendar snapshot={snapshot([issue(1, '2026-11-12', { assignee: null })])} now={NOW} />,
    )
    const link = screen.getByRole('link', { name: /티켓 1/ })
    expect(within(link).getByText('담당 없음')).toBeInTheDocument()
    expect(link.querySelector('.ring-1.ring-border svg')).not.toBeNull()
    expect(link).toHaveAccessibleName(/담당 없음/)
  })

  it('줄에 마우스를 올리면 번호·제목 전체·상태·기한(년도 포함)·라벨·마일스톤을 보여 준다', async () => {
    render(
      <MonthCalendar
        snapshot={snapshot([
          issue(1, '2026-11-12', {
            title: '아주 긴 제목이라 칸에는 들어가지 않는 티켓',
            state: { name: 'In Progress', type: 'started' },
            labels: [{ id: 'l1', name: '프론트', color: '#4ea7fc' }],
            milestone: { id: 'm1', name: '세미 발표', progress: 0.5 },
          }),
        ])}
        now={NOW}
      />,
    )
    // React Aria는 마우스가 한 번 움직인 뒤에만 툴팁을 연다.
    await userEvent.hover(document.body)
    await userEvent.hover(screen.getByRole('link', { name: /BUK-1/ }))
    const tip = await screen.findByRole('tooltip')
    expect(within(tip).getByText('BUK-1')).toBeInTheDocument()
    expect(within(tip).getByText('아주 긴 제목이라 칸에는 들어가지 않는 티켓')).toBeInTheDocument()
    expect(within(tip).getByText('진행 중')).toBeInTheDocument()
    expect(within(tip).getByText('2026년 11월 12일 (목)')).toBeInTheDocument()
    expect(within(tip).getByText('프론트').closest('.chip')).not.toBeNull()
    expect(within(tip).getByText('세미 발표').closest('.chip')).not.toBeNull()
  })

  it('마우스가 없는 기기에서는 줄을 누르면 상세를 보여 주고 「Linear에서 열기」로 이동한다', async () => {
    useTouchDevice()
    render(<MonthCalendar snapshot={snapshot([issue(1, '2026-11-12')])} now={NOW} />)
    const row = within(day('11월 12일')).getByRole('button', { name: /BUK-1 티켓 1/ })
    expect(row.className).toMatch(/cursor-pointer/)
    await userEvent.click(row)
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('티켓 1')).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: 'Linear에서 열기' })).toHaveAttribute(
      'href',
      'https://linear.app/bukang/issue/BUK-1',
    )
  })

  it('날짜 칸 이름에 요일을 넣어 화면 낭독기로도 요일을 알 수 있다', () => {
    render(<MonthCalendar snapshot={snapshot([])} now={NOW} />)
    expect(screen.getByRole('listitem', { name: '11월 12일 목요일' })).toBeInTheDocument()
    expect(screen.getByRole('listitem', { name: '11월 1일 일요일' })).toBeInTheDocument()
  })

  it('이번 달에 티켓이 없어도 앞뒤 달 칸에 티켓이 보이면 빈 안내를 띄우지 않는다', () => {
    render(<MonthCalendar snapshot={snapshot([issue(1, '2026-12-05')])} now={NOW} />)
    expect(screen.queryByText('이 달에 기한인 남은 티켓이 없어요')).not.toBeInTheDocument()
  })

  it('앞뒤 달 날짜 칸에도 그날 기한 티켓을 보여 준다', () => {
    render(
      <MonthCalendar
        // 2026년 11월은 일요일에 시작해서 앞 달 칸이 없고, 마지막 줄에 12월 1~5일이 보인다.
        snapshot={snapshot([issue(1, '2026-12-01'), issue(2, '2026-12-05')])}
        now={NOW}
      />,
    )
    expect(within(day('12월 1일')).getByText('BUK-1')).toBeInTheDocument()
    expect(within(day('12월 5일')).getByText('BUK-2')).toBeInTheDocument()
  })

  it('기한 지난 날 티켓 번호는 빨강, 오늘은 주황, 그 밖은 기본 색이다', () => {
    render(
      <MonthCalendar
        snapshot={snapshot([
          issue(1, '2026-11-04'),
          issue(2, '2026-11-05'),
          issue(3, '2026-11-06'),
        ])}
        now={NOW}
      />,
    )
    expect(number('BUK-1').className).toMatch(/text-danger/)
    expect(number('BUK-2').className).toMatch(/text-warning/)
    expect(number('BUK-3').className).not.toMatch(/text-danger|text-warning/)
    expect(day('11월 5일')).toHaveAttribute('aria-current', 'date')
  })

  it('한국 시간 자정이 지나면 어제 기한 티켓이 빨강이 된다', () => {
    const midnight = new Date('2026-11-05T15:00:00.000Z').getTime()
    render(<MonthCalendar snapshot={snapshot([issue(1, '2026-11-05')])} now={midnight} />)
    expect(number('BUK-1').className).toMatch(/text-danger/)
    expect(day('11월 6일')).toHaveAttribute('aria-current', 'date')
  })

  it('한 날짜에 티켓이 많으면 세 줄만 보여 주고 「n건 더」를 누르면 전체를 보여 준다', async () => {
    const many = Array.from({ length: 5 }, (_, n) => issue(n + 1, '2026-11-12'))
    render(<MonthCalendar snapshot={snapshot(many)} now={NOW} />)
    const cell = day('11월 12일')
    expect(within(cell).getAllByRole('link')).toHaveLength(3)

    const more = within(cell).getByRole('button', { name: '2건 더' })
    expect(more.className).toMatch(/cursor-pointer/)
    await userEvent.click(more)
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('11/12 기한 5건')).toBeInTheDocument()
    expect(within(dialog).getAllByRole('link')).toHaveLength(5)
    // 창 안의 줄도 날짜 칸과 같은 모양이다.
    const first = within(dialog).getByRole('link', { name: /BUK-1 티켓 1/ })
    expect(within(first).getByText('지훈')).toBeInTheDocument()
    expect(within(first).getByText('BUK-1')).toBeInTheDocument()
    expect(within(dialog).queryByText('티켓 1')).not.toBeInTheDocument()
  })

  it('휴대폰 폭에서 보여 줄 날짜별 티켓 수를 함께 둔다', () => {
    const many = Array.from({ length: 5 }, (_, n) => issue(n + 1, '2026-11-12'))
    render(<MonthCalendar snapshot={snapshot(many)} now={NOW} />)
    expect(within(day('11월 12일')).getByText('5건').className).toMatch(/md:hidden/)
  })

  it('이전 달·다음 달로 옮기고 「오늘」로 돌아온다', async () => {
    render(<MonthCalendar snapshot={snapshot([issue(1, '2026-12-20')])} now={NOW} />)
    await userEvent.click(screen.getByRole('button', { name: '다음 달' }))
    expect(screen.getByRole('heading', { name: '2026년 12월' })).toBeInTheDocument()
    expect(within(day('12월 20일')).getByText('BUK-1')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '오늘' }))
    await userEvent.click(screen.getByRole('button', { name: '이전 달' }))
    expect(screen.getByRole('heading', { name: '2026년 10월' })).toBeInTheDocument()
  })

  it('최종 발표일 칸에 「최종 발표」를 적고, 사이클 기간 칸은 연한 바탕이다', () => {
    const cycle: Cycle = {
      id: 'c1',
      number: 1,
      name: null,
      startsAt: '2026-11-08T15:00:00.000Z',
      endsAt: '2026-11-15T15:00:00.000Z',
    }
    render(<MonthCalendar snapshot={snapshot([], [cycle])} now={NOW} />)
    expect(within(day('11월 23일')).getByText('최종 발표')).toBeInTheDocument()
    expect(day('11월 9일').className).toMatch(/bg-accent-soft/)
    expect(day('11월 16일').className).not.toMatch(/bg-accent-soft/)
  })

  it('주소의 필터를 적용한다', () => {
    search = 'assignee=none'
    render(
      <MonthCalendar
        snapshot={snapshot([issue(1, '2026-11-12'), issue(2, '2026-11-12', { assignee: null })])}
        now={NOW}
      />,
    )
    expect(screen.queryByText('BUK-1')).not.toBeInTheDocument()
    expect(screen.getByText('BUK-2')).toBeInTheDocument()
  })

  it('이 달에 기한인 티켓이 없으면 빈 안내를 보여 준다', () => {
    render(
      <MonthCalendar snapshot={snapshot([issue(1, '2027-01-10'), issue(2, null)])} now={NOW} />,
    )
    expect(screen.getByText('이 달에 기한인 남은 티켓이 없어요')).toBeInTheDocument()
  })

  describe('요일 순서와 주말', () => {
    const number = (name: string) =>
      within(screen.getByRole('listitem', { name })).getByText(/^\d+$|\//)

    it('일요일부터 토요일까지 보여 준다', () => {
      const { container } = render(<MonthCalendar snapshot={snapshot([])} now={NOW} />)
      const header = container.querySelector('[aria-hidden="true"].grid-cols-7')!
      expect([...header.children].map((c) => c.textContent)).toEqual([
        '일',
        '월',
        '화',
        '수',
        '목',
        '금',
        '토',
      ])
      expect(header.children[0]).toHaveClass('text-red-700')
      expect(header.children[6]).toHaveClass('text-red-700')
      expect(header.children[3]).not.toHaveClass('text-red-700')
    })

    it('주말 날짜 숫자는 빨강, 앞뒤 달 주말은 흐린 빨강으로 쓰고 바탕은 칠하지 않는다', () => {
      render(<MonthCalendar snapshot={snapshot([])} now={NOW} />)
      expect(number('11월 7일 토요일')).toHaveClass('text-red-700')
      expect(number('11월 8일 일요일')).toHaveClass('text-red-700')
      expect(number('11월 12일 목요일')).not.toHaveClass('text-red-700')
      // 11월 달력의 마지막 줄에 보이는 12월 5일(토)
      expect(number('12월 5일 토요일')).toHaveClass('text-red-600')
      expect(number('11월 7일 토요일').className).not.toMatch(/\bbg-/)
    })
  })
})
