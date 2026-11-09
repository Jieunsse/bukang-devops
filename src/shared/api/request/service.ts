import type { Member } from '../linear'
import { passwordMatches } from '../schedule/password'
import {
  NO_CYCLE,
  workRequestInputSchema,
  type RequestOptions,
  type WorkRequestInput,
  type WorkRequestResult,
} from './schema'

/** 설명 끝에 붙여 작업 요청으로 만든 티켓을 나중에 찾는다. 바꾸면 예전 요청이 내역에서 빠진다. */
export const REQUEST_MARKER = '(부캉이 작업 요청)'

export type NewIssue = {
  title: string
  description: string
  assigneeId: string
  dueDate: string | null
  projectId: string
  projectMilestoneId: string | null
  labelIds: string[]
  priority: number
  cycleId: string | null
}
export type IssueCreator = (issue: NewIssue) => Promise<{ identifier: string; url: string }>

/** 브라우저에서 온 id라서 서버가 받아 온 선택지 안에 있는지 다시 본다. */
function withinOptions(input: WorkRequestInput, options: RequestOptions): boolean {
  const project = options.projects.find((p) => p.id === input.projectId)
  if (!project) return false
  if (input.milestoneId && !project.milestones.some((m) => m.id === input.milestoneId)) return false
  if (!input.labelIds.every((id) => options.labels.some((l) => l.id === id))) return false
  return input.cycleId === NO_CYCLE || options.cycles.some((c) => c.id === input.cycleId)
}

/**
 * 팀 비밀번호가 맞고 값이 올바를 때만 Linear 티켓을 만든다. 비밀번호를 먼저 본다.
 * Linear 키 주인이 만든 사람으로 찍히므로, 실제로 요청한 팀원은 설명 끝에 적는다.
 */
export async function createWorkRequest(
  deps: {
    create: IssueCreator
    members: Member[]
    options: RequestOptions
    expectedPassword: string | undefined
  },
  givenPassword: unknown,
  request: unknown,
): Promise<WorkRequestResult> {
  if (typeof givenPassword !== 'string' || !passwordMatches(givenPassword, deps.expectedPassword)) {
    return { ok: false, reason: 'password' }
  }
  const parsed = workRequestInputSchema.safeParse(request)
  if (!parsed.success || !withinOptions(parsed.data, deps.options)) {
    return { ok: false, reason: 'invalid' }
  }
  const { assigneeId, requesterId, title, description, dueDate, ...fields } = parsed.data
  const nameOf = (id: string) => deps.members.find((m) => m.id === id)?.name
  const requester = nameOf(requesterId)
  // 브라우저에서 온 id라서 BUK 팀 멤버인지 서버에서 다시 본다.
  if (!nameOf(assigneeId) || !requester) return { ok: false, reason: 'invalid' }

  const footer = `요청한 사람: ${requester} ${REQUEST_MARKER}`
  try {
    const issue = await deps.create({
      title,
      assigneeId,
      dueDate: dueDate || null,
      description: description ? `${description}\n\n---\n${footer}` : footer,
      projectId: fields.projectId,
      projectMilestoneId: fields.milestoneId || null,
      labelIds: fields.labelIds,
      priority: fields.priority,
      cycleId: fields.cycleId === NO_CYCLE ? null : fields.cycleId,
    })
    return { ok: true, ...issue }
  } catch (error) {
    console.error('작업 요청 티켓을 만들지 못했어요', error)
    return { ok: false, reason: 'failed' }
  }
}
