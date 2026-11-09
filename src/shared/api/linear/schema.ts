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
  // id와 position은 상태별 보드의 열 순서에 쓴다. 화면 모양에서는 빼도 된다.
  state: z.object({
    name: z.string(),
    type: z.string(),
    id: z.string().optional(),
    position: z.number().optional(),
  }),
  assignee: z.object({ id: z.string(), name: z.string(), avatarUrl: z.url().nullish() }).nullable(),
  labels: z.array(
    // 색은 Linear 라벨에 정해 둔 색 코드다. 칩 색을 Linear 화면과 맞춘다.
    z.object({
      id: z.string(),
      name: z.string(),
      color: z
        .string()
        .regex(/^#[0-9a-f]{6}$/i)
        .optional(),
    }),
  ),
  milestone: z.object({ id: z.string(), name: z.string(), progress: z.number() }).nullable(),
  // 화면 모양에서는 빼도 된다(사이클 밖과 같다). Linear 응답에서는 반드시 받는다.
  cycle: z.object({ id: z.string() }).nullish(),
  /** 0 없음, 1 긴급, 2 높음, 3 보통, 4 낮음. 아래 세 칸도 화면 모양에서는 빼도 된다. */
  priority: z.number().int().min(0).max(4).optional(),
  createdAt: z.iso.datetime({ offset: true }).optional(),
  parent: z.object({ identifier: z.string(), title: z.string() }).nullish(),
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

/** BUK 팀 멤버. 남은 티켓이 0건이어도 사람별 화면에 보여 주려고 받는다. 이름은 실명 규칙을 거친 값이다. */
export const memberSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatarUrl: z.url().nullish(),
})

/** 팀이 진행 중인 Linear 프로젝트. 진행률은 Linear가 계산한 0~1 값이다. */
export const projectSchema = z.object({ name: z.string(), progress: z.number().min(0).max(1) })

export const snapshotSchema = z.object({
  fetchedAt: z.iso.datetime(),
  /** Linear에서 새로 받지 못해 마지막 성공 값을 보여 주는 중이면 그 이유. 새로 받으면 없다. */
  failure: z.string().optional(),
  issues: z.array(issueSchema),
  cycles: z.array(cycleSchema),
  /** 예전에 저장된 값이나 예시 데이터에는 없을 수 있다. 없으면 빈 목록으로 본다. */
  members: z.array(memberSchema).optional(),
  /** 예전에 저장된 값에는 없다. 진행 중인 프로젝트가 없으면 null이다. */
  project: projectSchema.nullish(),
})

export type Issue = z.infer<typeof issueSchema>
export type Member = z.infer<typeof memberSchema>
export type Cycle = z.infer<typeof cycleSchema>
export type Project = z.infer<typeof projectSchema>
export type Snapshot = z.infer<typeof snapshotSchema>

// Linear GraphQL이 돌려주는 모양
/** 티켓마다 받는 칸. 끝나지 않은 티켓과 완료·취소 티켓이 같은 검사를 거쳐서 한곳에 둔다. */
export const ISSUE_FIELDS = `
  id identifier title url dueDate startedAt createdAt priority
  state { id name type position }
  assignee { id name avatarUrl }
  labels(first: 20) { nodes { id name color } }
  projectMilestone { id name progress }
  cycle { id }
  parent { identifier title }
`

const pageInfo = z.object({ hasNextPage: z.boolean(), endCursor: z.string().nullable() })

export const rawIssueSchema = issueSchema
  .omit({ labels: true, milestone: true })
  .extend({
    labels: z.object({ nodes: issueSchema.shape.labels }),
    cycle: z.object({ id: z.string() }).nullable(),
    state: z.object({ id: z.string(), name: z.string(), type: z.string(), position: z.number() }),
    priority: z.number().int().min(0).max(4),
    createdAt: z.iso.datetime({ offset: true }),
    parent: z.object({ identifier: z.string(), title: z.string() }).nullable(),
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

/** 비활성 멤버는 빼고, 이름은 실명 규칙으로 바꾼다. */
const rawMemberSchema = memberSchema.extend({ active: z.boolean() })

export const membersResponseSchema = z
  .object({
    teams: z.object({
      nodes: z.array(
        z.object({ members: z.object({ nodes: z.array(rawMemberSchema), pageInfo }) }),
      ),
    }),
  })
  .transform(({ teams }) => {
    const page = teams.nodes[0]?.members ?? {
      nodes: [],
      pageInfo: { hasNextPage: false, endCursor: null },
    }
    return {
      members: {
        nodes: page.nodes
          .filter((m) => m.active)
          .map(({ id, name, avatarUrl }) => ({ id, name: displayName({ id, name }), avatarUrl })),
        pageInfo: page.pageInfo,
      },
    }
  })

/** 진행 중인 프로젝트 중 첫 번째. 없으면 null. */
export const projectResponseSchema = z
  .object({
    teams: z.object({
      nodes: z.array(z.object({ projects: z.object({ nodes: z.array(projectSchema) }) })),
    }),
  })
  .transform(({ teams }) => teams.nodes[0]?.projects.nodes[0] ?? null)
