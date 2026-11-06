import { z } from 'zod'

import { calendarDate } from '../linear/done-schema'

export const REQUEST_TITLE_MAX = 100
export const REQUEST_DESCRIPTION_MAX = 2000

/** 작업 요청 창에서 받는 값. 서버가 Linear에 보내기 전에 다시 검사한다. */
export const workRequestInputSchema = z.object({
  assigneeId: z.string().min(1, '요청받을 팀원을 골라 주세요.'),
  requesterId: z.string().min(1, '요청하는 사람을 골라 주세요.'),
  title: z
    .string()
    .trim()
    .min(1, '제목을 적어 주세요.')
    .max(REQUEST_TITLE_MAX, `제목은 ${REQUEST_TITLE_MAX}자까지 적을 수 있어요.`),
  description: z
    .string()
    .trim()
    .max(REQUEST_DESCRIPTION_MAX, `설명은 ${REQUEST_DESCRIPTION_MAX}자까지 적을 수 있어요.`),
  // 기한은 고르지 않아도 된다. 빈 문자열이면 기한 없이 만든다.
  dueDate: z.union([z.literal(''), calendarDate]),
})
export type WorkRequestInput = z.infer<typeof workRequestInputSchema>

export type WorkRequestResult =
  | { ok: true; identifier: string; url: string }
  | { ok: false; reason: 'password' | 'invalid' | 'failed' }
