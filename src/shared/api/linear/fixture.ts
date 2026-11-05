import type { Cycle, Issue, Snapshot } from './schema'
import { addDays, kstDate, weekdayOf } from '../../lib/date'

// 키 없이 화면을 볼 때 쓰는 예시 데이터. 기한은 오늘 기준이라 날마다 모든 묶음이 채워진다.
const people = [
  { id: 'u-jihoon', name: '지훈' },
  { id: 'u-sohee', name: '소희' },
  { id: 'u-minjun', name: '민준' },
  { id: 'u-seoyeon', name: '서연' },
  { id: 'u-doyun', name: '도윤' },
] as const
const labels = {
  fe: { id: 'l-fe', name: '프론트', color: '#4ea7fc' },
  be: { id: 'l-be', name: '백엔드', color: '#26b5ce' },
  bug: { id: 'l-bug', name: '버그', color: '#eb5757' },
  docs: { id: 'l-docs', name: '문서', color: '#bec2c8' },
}
const milestones = {
  semi: { id: 'm-semi', name: '세미 발표', progress: 0.82 },
  final: { id: 'm-final', name: '최종 발표', progress: 0.35 },
  pay: { id: 'm-pay', name: '결제·정산', progress: 0.6 },
}

type Row = [
  title: string,
  dueOffset: number | null,
  person: number | null,
  label: (keyof typeof labels)[],
  milestone: keyof typeof milestones | null,
  started: boolean,
]

const rows: Row[] = [
  ['소셜 로그인 콜백 오류 처리', -3, 0, ['fe', 'bug'], 'semi', true],
  ['예치금 충전 실패 안내', -1, 1, ['fe'], 'pay', true],
  ['정산 배치 재시도', -1, 2, ['be'], 'pay', true],
  ['대회 상세 화면 접근성 점검', 0, 3, ['fe'], 'final', true],
  ['게이트웨이 토큰 검증 로그', 0, null, ['be'], 'final', false],
  ['참가권 양도 API', 1, 2, ['be'], 'final', true],
  ['크루 탈퇴 이벤트 발행', 2, 4, ['be'], null, false],
  ['발표 장표 데모 영상', 3, 0, ['docs'], 'final', false],
  ['굿즈 배송 조회 화면', 6, 1, ['fe'], 'final', false],
  ['관리자 신고 계정 목록', 9, 3, ['fe', 'be'], 'final', false],
  ['정책 문서 정리', 13, 4, ['docs'], null, false],
  ['다크 모드 색 점검', null, 0, ['fe'], null, false],
  ['검색 결과 정렬 옵션', null, 3, ['fe'], 'final', false],
  ['주문 내역 엑셀 내려받기', null, null, ['be'], null, false],
]

export function createFixtureSnapshot(now: Date = new Date()): Snapshot {
  const today = kstDate(now)
  const daysToMonday = (8 - weekdayOf(today)) % 7 || 7
  const kstMidnight = (date: string) => new Date(`${date}T00:00:00+09:00`).toISOString()

  const nextMonday = addDays(today, daysToMonday)
  // 지난 사이클은 끝났고 다음 사이클은 다음 주 월요일에 시작한다. 그래서 오늘은 사이클 밖 기간이다.
  const cycles: Cycle[] = [
    {
      id: 'c-6',
      number: 6,
      name: null,
      startsAt: kstMidnight(addDays(nextMonday, -21)),
      endsAt: kstMidnight(addDays(nextMonday, -14)),
      completedIssueCount: 9,
    },
    {
      id: 'c-7',
      number: 7,
      name: null,
      startsAt: kstMidnight(nextMonday),
      endsAt: kstMidnight(addDays(nextMonday, 7)),
      completedIssueCount: 1,
    },
  ]

  const issues: Issue[] = rows.map(([title, due, person, labelKeys, milestone, started], n) => {
    const number = 300 + n
    return {
      id: `i-${number}`,
      identifier: `BUK-${number}`,
      title,
      url: `https://linear.app/bukang/issue/BUK-${number}`,
      dueDate: due === null ? null : addDays(today, due),
      startedAt: started ? kstMidnight(addDays(today, -5)) : null,
      state: started ? { name: '진행 중', type: 'started' } : { name: '할 일', type: 'unstarted' },
      assignee: person === null ? null : { ...people[person]! },
      labels: labelKeys.map((k) => labels[k]),
      milestone: milestone === null ? null : milestones[milestone],
      // 기한이 다음 사이클 안인 티켓은 그 사이클에 넣어, 사이클 탭과 사이클 밖 탭이 모두 채워지게 한다.
      cycle: due !== null && due >= daysToMonday && due < daysToMonday + 7 ? { id: 'c-7' } : null,
    }
  })

  return { fetchedAt: now.toISOString(), issues, cycles }
}
