import { z } from 'zod'

import { addDays, daysBetween, type DateString } from '../../lib/date'
import { issueSchema, rawIssueSchema } from './schema'

// 완료·취소 페이지에서 쓰는 모양. 대시보드 스냅샷과 따로 받는다.
export const doneIssueSchema = issueSchema.extend({
  /** 완료 시각 또는 취소 시각 */
  closedAt: z.iso.datetime({ offset: true }),
})
export type DoneIssue = z.infer<typeof doneIssueSchema>

/** 한 번에 고를 수 있는 가장 긴 기간. Linear 호출 한도를 지키려고 둔다. */
export const MAX_RANGE_DAYS = 90
const DEFAULT_RANGE_DAYS = 14

/** 'YYYY-MM-DD' 모양이고 달력에 있는 날짜. 2000~2099년만 받아 쓸데없는 Linear 호출을 막는다. */
const calendarDate = z
  .string()
  .regex(/^20\d{2}-\d{2}-\d{2}$/, '날짜를 골라 주세요.')
  .refine((s) => {
    const date = new Date(`${s}T00:00:00Z`)
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === s
  }, '날짜를 골라 주세요.')

/** 시작일과 종료일 모두 그날을 포함한다. */
export const doneRangeSchema = z
  .object({ start: calendarDate, end: calendarDate })
  .refine((r) => r.start <= r.end, { message: '시작일이 종료일보다 늦어요.', path: ['start'] })
  .refine((r) => daysBetween(r.start, r.end) < MAX_RANGE_DAYS, {
    message: `기간은 ${MAX_RANGE_DAYS}일까지 고를 수 있어요.`,
    path: ['end'],
  })
export type DoneRange = z.infer<typeof doneRangeSchema>

export function defaultDoneRange(today: DateString): DoneRange {
  return { start: addDays(today, -(DEFAULT_RANGE_DAYS - 1)), end: today }
}

/** 주소의 from, to를 읽는다. 없거나 틀리면 기본 기간을 쓰고, 틀렸으면 이유를 함께 준다. */
export function parseDoneRange(
  params: URLSearchParams,
  today: DateString,
): { range: DoneRange; error?: string } {
  const start = params.get('from')
  const end = params.get('to')
  if (start === null && end === null) return { range: defaultDoneRange(today) }
  const parsed = doneRangeSchema.safeParse({ start, end })
  if (parsed.success) return { range: parsed.data }
  return {
    range: defaultDoneRange(today),
    error: `${parsed.error.issues[0]?.message ?? '기간이 올바르지 않아요.'} 최근 2주를 보여 드려요.`,
  }
}

// Linear GraphQL이 돌려주는 모양
const pageInfo = z.object({ hasNextPage: z.boolean(), endCursor: z.string().nullable() })
const instant = z.iso.datetime({ offset: true }).nullable()

const rawDoneIssueSchema = z
  .object({ completedAt: instant, canceledAt: instant })
  .and(rawIssueSchema)
  .transform(({ completedAt, canceledAt, ...issue }, ctx) => {
    // Linear의 「중복」 상태는 취소의 한 갈래라 취소 시각만 있다. 화면에서는 취소로 센다.
    const state =
      issue.state.type === 'duplicate' ? { ...issue.state, type: 'canceled' } : issue.state
    // 완료했다가 취소한 티켓은 두 시각이 모두 있을 수 있어 상태 종류로 고른다.
    const closedAt = state.type === 'canceled' ? canceledAt : completedAt
    if (closedAt === null) {
      ctx.addIssue({ code: 'custom', message: '상태에 맞는 완료 시각이나 취소 시각이 없어요.' })
      return z.NEVER
    }
    return { ...issue, state, closedAt }
  })

export const doneIssuesResponseSchema = z.object({
  issues: z.object({ nodes: z.array(rawDoneIssueSchema), pageInfo }),
})
