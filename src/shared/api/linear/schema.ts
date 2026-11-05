import { z } from 'zod'

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
  assignee: z.object({ id: z.string(), name: z.string() }).nullable(),
  labels: z.array(z.object({ id: z.string(), name: z.string() })),
  milestone: z.object({ id: z.string(), name: z.string(), progress: z.number() }).nullable(),
})

export const cycleSchema = z.object({
  id: z.string(),
  number: z.number(),
  name: z.string().nullable(),
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }),
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
    projectMilestone: issueSchema.shape.milestone,
  })
  .transform(({ labels, projectMilestone, ...rest }) => ({
    ...rest,
    labels: labels.nodes,
    milestone: projectMilestone,
  }))

export const issuesResponseSchema = z.object({
  issues: z.object({ nodes: z.array(rawIssueSchema), pageInfo }),
})

export const cyclesResponseSchema = z.object({
  cycles: z.object({ nodes: z.array(cycleSchema), pageInfo }),
})
