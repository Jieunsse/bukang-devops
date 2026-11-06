import { z } from 'zod'

import { passwordMatches } from './password'
import {
  scheduleIdSchema,
  scheduleInputSchema,
  type Schedule,
  type ScheduleInput,
  type WriteResult,
} from './schema'

export type ScheduleStore = {
  list(): Promise<Schedule[]>
  create(input: ScheduleInput): Promise<void>
  /** 일정이 없으면(다른 사람이 지웠으면) false */
  update(id: string, input: ScheduleInput): Promise<boolean>
  remove(id: string): Promise<void>
}

// 브라우저에서 온 값이라 모양을 믿지 않고 다시 검사한다.
const requestSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('create'), input: scheduleInputSchema }),
  z.object({ kind: z.literal('update'), id: scheduleIdSchema, input: scheduleInputSchema }),
  z.object({ kind: z.literal('delete'), id: scheduleIdSchema }),
])

/** 비밀번호가 맞고 값이 올바를 때만 저장한다. 비밀번호를 먼저 본다. */
export async function writeSchedule(
  store: ScheduleStore,
  expectedPassword: string | undefined,
  givenPassword: unknown,
  request: unknown,
): Promise<WriteResult> {
  if (typeof givenPassword !== 'string' || !passwordMatches(givenPassword, expectedPassword)) {
    return { ok: false, reason: 'password' }
  }
  const parsed = requestSchema.safeParse(request)
  if (!parsed.success) return { ok: false, reason: 'invalid' }
  const req = parsed.data
  if (req.kind === 'create') await store.create(req.input)
  else if (req.kind === 'update') {
    if (!(await store.update(req.id, req.input))) return { ok: false, reason: 'missing' }
  } else await store.remove(req.id)
  return { ok: true }
}
