import { z } from 'zod'

import { calendarDate } from '../linear/done-schema'

export const REQUEST_TITLE_MAX = 100
export const REQUEST_DESCRIPTION_MAX = 2000
export const NO_CYCLE = 'none'

/** Linear 우선순위 값. 0(없음)은 고르지 못하게 뺐다. */
export const PRIORITY_LABEL: Record<1 | 2 | 3 | 4, string> = {
  1: '긴급',
  2: '높음',
  3: '보통',
  4: '낮음',
}

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
  // 아래 칸은 받는 사람이 다시 채우지 않게 요청하는 사람이 정해서 보낸다.
  projectId: z.string().min(1, '프로젝트를 골라 주세요.'),
  // 빈 문자열이면 마일스톤 없이 만든다.
  milestoneId: z.string(),
  labelIds: z.array(z.string()).min(1, '라벨을 하나 이상 골라 주세요.'),
  priority: z.number().int().min(1, '우선순위를 골라 주세요.').max(4, '우선순위를 골라 주세요.'),
  // NO_CYCLE이면 사이클 없이 만든다. 빈 문자열은 아직 고르지 않은 것이다.
  cycleId: z.string().min(1, '사이클을 골라 주세요.'),
})
export type WorkRequestInput = z.infer<typeof workRequestInputSchema>

export type WorkRequestResult =
  | { ok: true; identifier: string; url: string }
  | { ok: false; reason: 'password' | 'invalid' | 'failed' }

/** 작업 요청 창에서 고르는 Linear 값. 서버가 받아 오고, 받은 값 밖의 id는 거절한다. */
export type RequestOptions = {
  teamId: string
  labels: { id: string; name: string; color?: string }[]
  projects: { id: string; name: string; milestones: { id: string; name: string }[] }[]
  cycles: { id: string; number: number; name: string | null; startsAt: string; endsAt: string }[]
}

/** 작업 요청으로 만든 티켓 하나. 누구나 볼 수 있게 설명 본문은 빼고 보낸다. */
export type RequestLogEntry = {
  identifier: string
  title: string
  url: string
  createdAt: string
  /** 설명 끝 「요청한 사람」 줄이 지워졌으면 null */
  requester: string | null
  assignee: { name: string; avatarUrl: string | null } | null
  state: { id: string; name: string; type: string; position: number }
}
