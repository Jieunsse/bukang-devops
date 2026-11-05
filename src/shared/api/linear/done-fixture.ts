import { addDays, kstDate } from '../../lib/date'
import type { DoneIssue, DoneRange } from './done-schema'

// 키 없이 화면을 볼 때 쓰는 예시 데이터. 닫힌 날은 오늘 기준이라 기본 기간에 늘 들어온다.
type Row = [
  title: string,
  daysAgo: number,
  person: string | null,
  canceled: boolean,
  milestone: boolean,
]

const rows: Row[] = [
  ['회원 가입 이메일 인증', 0, '지훈', false, true],
  ['예치금 충전 결과 확인', 1, '소희', false, true],
  ['정산 금액 반올림 오류', 2, '민준', false, false],
  ['대회 목록 정렬 버튼', 3, null, true, false],
  ['굿즈 상세 이미지 확대', 5, '서연', false, true],
  ['크루 초대 링크 만료', 8, '도윤', true, true],
  ['발표 장표 초안', 12, '지훈', false, false],
  ['지난 사이클 회고 정리', 30, '소희', false, false],
]

export function createFixtureDone(range: DoneRange, now: Date = new Date()): DoneIssue[] {
  const today = kstDate(now)
  return rows
    .map(([title, daysAgo, person, canceled, milestone], n): DoneIssue => {
      const number = 200 + n
      return {
        id: `d-${number}`,
        identifier: `BUK-${number}`,
        title,
        url: `https://linear.app/bukang/issue/BUK-${number}`,
        dueDate: addDays(today, -daysAgo),
        startedAt: null,
        // 한국 시간 오후 2시
        closedAt: new Date(`${addDays(today, -daysAgo)}T14:00:00+09:00`).toISOString(),
        state: canceled ? { name: '취소', type: 'canceled' } : { name: '완료', type: 'completed' },
        assignee: person === null ? null : { id: `u-${person}`, name: person },
        labels: [{ id: 'l-fe', name: '프론트' }],
        milestone: milestone ? { id: 'm-semi', name: '세미 발표', progress: 0.82 } : null,
      }
    })
    .filter((i) => {
      const day = kstDate(i.closedAt)
      return day >= range.start && day <= range.end
    })
}
