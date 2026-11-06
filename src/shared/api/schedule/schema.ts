import { z } from 'zod'

import { calendarDate } from '../linear/done-schema'

export const TITLE_MAX = 60

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
})
export type Schedule = z.infer<typeof scheduleSchema>

export type WriteRequest =
  | { kind: 'create'; input: ScheduleInput }
  | { kind: 'update'; id: string; input: ScheduleInput }
  | { kind: 'delete'; id: string }

export type WriteResult = { ok: true } | { ok: false; reason: 'password' | 'invalid' | 'missing' }
