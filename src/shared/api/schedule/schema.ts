import { z } from 'zod'

import { calendarDate } from '../linear/done-schema'

export const TITLE_MAX = 60

/**
 * 일정 라벨 색. 빨강·주황은 티켓 기한(지남·오늘) 뜻이라 쓰지 않는다. 앞의 것이 기본색이다.
 * 화면에 그리는 색은 widgets/calendar의 SCHEDULE_COLOR_STYLE에 있다.
 */
export const SCHEDULE_COLORS = ['blue', 'green', 'violet', 'teal', 'gray'] as const
export type ScheduleColor = (typeof SCHEDULE_COLORS)[number]
export const DEFAULT_SCHEDULE_COLOR: ScheduleColor = 'blue'
export const SCHEDULE_COLOR_LABEL: Record<ScheduleColor, string> = {
  blue: '파랑',
  green: '초록',
  violet: '보라',
  teal: '청록',
  gray: '회색',
}

/** 추가·수정 창에서 받는 값. 서버가 저장하기 전에 다시 검사한다. */
export const scheduleInputSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, '제목을 적어 주세요.')
      .max(TITLE_MAX, `제목은 ${TITLE_MAX}자까지 적을 수 있어요.`),
    start: calendarDate,
    end: calendarDate,
    color: z.enum(SCHEDULE_COLORS),
  })
  .refine((s) => s.start <= s.end, { message: '종료일이 시작일보다 빨라요.', path: ['end'] })
export type ScheduleInput = z.infer<typeof scheduleInputSchema>

// Firestore 문서 번호. 경로 문자(/)가 섞이면 다른 문서를 가리킬 수 있어서 막는다.
export const scheduleIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/)

export const scheduleSchema = z.object({
  id: scheduleIdSchema,
  title: z.string(),
  start: calendarDate,
  end: calendarDate,
  // 색을 넣기 전에 만든 문서처럼 색이 없거나 모르는 값이면 기본색으로 본다.
  color: z.enum(SCHEDULE_COLORS).catch(DEFAULT_SCHEDULE_COLOR),
})
export type Schedule = z.infer<typeof scheduleSchema>

export type WriteRequest =
  | { kind: 'create'; input: ScheduleInput }
  | { kind: 'update'; id: string; input: ScheduleInput }
  | { kind: 'delete'; id: string }

export type WriteResult = { ok: true } | { ok: false; reason: 'password' | 'invalid' | 'missing' }
