import { z } from 'zod'

import { displayName } from './display-names'

// 화면에서 쓰는 모양. 서버 캐시와 브라우저 저장소에 이 모양 그대로 들어간다.
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const issueSchema = z.object({
  id: z.string(),
  identifier: z.string(),
  title: z.string(),
  url: z.url(),
  dueDate: dateString.nullable(),
  startedAt: z.iso.datetime({ offset: true }).nullable(),
  state: z.object({ name: z.string(), type: z.string() }),
  assignee: z.object({ id: z.string(), name: z.string(), avatarUrl: z.url().nullish() }).nullable(),
  labels: z.array(z.object({ id: z.string(), name: z.string() })),
  milestone: z.object({ id: z.string(), name: z.string(), progress: z.number() }).nullable(),
  // 화면 모양에서는 빼도 된다(사이클 밖과 같다). Linear 응답에서는 반드시 받는다.
  cycle: z.object({ id: z.string() }).nullish(),
})

export const cycleSchema = z.object({
  id: z.string(),
  number: z.number(),
  name: z.string().nullable(),
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }),
  /** 이 사이클에서 끝낸 티켓 수. 모르면 0으로 본다. */
  completedIssueCount: z.number().optional(),
})

export const snapshotSchema = z.object({
  fetchedAt: z.iso.datetime(),
  issues: z.array(issueSchema),
  cycles: z.array(cycleSchema),
})

export type Issue = z.infer<typeof issueSchema>
export type Cycle = z.infer<typeof cycleSchema>
export type Snapshot = z.infer<typeof snapshotSchema>

// Linear GraphQL이 돌려주는 모양
const pageInfo = z.object({ hasNextPage: z.boolean(), endCursor: z.string().nullable() })

const rawIssueSchema = issueSchema
  .omit({ labels: true, milestone: true })
  .extend({
    labels: z.object({ nodes: issueSchema.shape.labels }),
    cycle: z.object({ id: z.string() }).nullable(),
    // Linear는 마일스톤 진행률을 0~100으로 준다. 화면은 0~1로 쓴다.
    projectMilestone: z
      .object({ id: z.string(), name: z.string(), progress: z.number().min(0).max(100) })
      .nullable(),
  })
  .transform(({ labels, projectMilestone, assignee, ...rest }) => ({
    ...rest,
    assignee: assignee && { ...assignee, name: displayName(assignee) },
    labels: labels.nodes,
    milestone: projectMilestone && {
      ...projectMilestone,
      progress: projectMilestone.progress / 100,
    },
  }))

export const issuesResponseSchema = z.object({
  issues: z.object({ nodes: z.array(rawIssueSchema), pageInfo }),
})

const rawCycleSchema = cycleSchema
  .omit({ completedIssueCount: true })
  .extend({ completedIssueCountHistory: z.array(z.number()) })
  // Linear는 날마다 완료 수를 쌓는다. 마지막 값이 지금 완료 수이고, 시작 전 사이클은 비어 있다.
  .transform(({ completedIssueCountHistory, ...rest }) => ({
    ...rest,
    completedIssueCount: completedIssueCountHistory.at(-1) ?? 0,
  }))

export const cyclesResponseSchema = z.object({
  cycles: z.object({ nodes: z.array(rawCycleSchema), pageInfo }),
})
