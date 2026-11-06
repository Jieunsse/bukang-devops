import type { Member } from '../linear'
import { passwordMatches } from '../schedule/password'
import { workRequestInputSchema, type WorkRequestResult } from './schema'

export type NewIssue = {
  title: string
  description: string
  assigneeId: string
  dueDate: string | null
}
export type IssueCreator = (issue: NewIssue) => Promise<{ identifier: string; url: string }>

/**
 * 팀 비밀번호가 맞고 값이 올바를 때만 Linear 티켓을 만든다. 비밀번호를 먼저 본다.
 * Linear 키 주인이 만든 사람으로 찍히므로, 실제로 요청한 팀원은 설명 끝에 적는다.
 */
export async function createWorkRequest(
  deps: { create: IssueCreator; members: Member[]; expectedPassword: string | undefined },
  givenPassword: unknown,
  request: unknown,
): Promise<WorkRequestResult> {
  if (typeof givenPassword !== 'string' || !passwordMatches(givenPassword, deps.expectedPassword)) {
    return { ok: false, reason: 'password' }
  }
  const parsed = workRequestInputSchema.safeParse(request)
  if (!parsed.success) return { ok: false, reason: 'invalid' }
  const { assigneeId, requesterId, title, description, dueDate } = parsed.data
  const nameOf = (id: string) => deps.members.find((m) => m.id === id)?.name
  const requester = nameOf(requesterId)
  // 브라우저에서 온 id라서 BUK 팀 멤버인지 서버에서 다시 본다.
  if (!nameOf(assigneeId) || !requester) return { ok: false, reason: 'invalid' }

  const footer = `요청한 사람: ${requester} (부캉이 작업 요청)`
  try {
    const issue = await deps.create({
      title,
      assigneeId,
      dueDate: dueDate || null,
      description: description ? `${description}\n\n---\n${footer}` : footer,
    })
    return { ok: true, ...issue }
  } catch (error) {
    console.error('작업 요청 티켓을 만들지 못했어요', error)
    return { ok: false, reason: 'failed' }
  }
}
