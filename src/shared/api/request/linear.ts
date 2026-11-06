import 'server-only'

import { z } from 'zod'

import { LinearRequestError, request, TEAM_KEY, type FetchImpl } from '../linear/fetch-snapshot'
import type { RequestOptions } from './schema'
import type { IssueCreator } from './service'

// 지난 사이클은 고를 일이 없어서 받지 않는다. 안쪽 목록 크기는 쿼리 복잡도 한도 때문에 정한다.
const OPTIONS_QUERY = `
  query RequestOptions($teamKey: String!) {
    teams(first: 1, filter: { key: { eq: $teamKey } }) {
      nodes {
        id
        labels(first: 100) { nodes { id name color isGroup } }
        projects(first: 50) {
          nodes { id name state projectMilestones(first: 50) { nodes { id name } } }
        }
        cycles(first: 20, filter: { isPast: { eq: false } }) {
          nodes { id number name startsAt endsAt }
        }
      }
    }
  }
`

const CREATE_MUTATION = `
  mutation Create($input: IssueCreateInput!) {
    issueCreate(input: $input) { success issue { identifier url } }
  }
`

const nodes = <T extends z.ZodType>(item: T) => z.object({ nodes: z.array(item) })

const optionsSchema = z.object({
  teams: nodes(
    z.object({
      id: z.string(),
      labels: nodes(
        z.object({ id: z.string(), name: z.string(), color: z.string(), isGroup: z.boolean() }),
      ),
      projects: nodes(
        z.object({
          id: z.string(),
          name: z.string(),
          state: z.string(),
          projectMilestones: nodes(z.object({ id: z.string(), name: z.string() })),
        }),
      ),
      cycles: nodes(
        z.object({
          id: z.string(),
          number: z.number(),
          name: z.string().nullable(),
          startsAt: z.string(),
          endsAt: z.string(),
        }),
      ),
    }),
  ),
})

const createSchema = z.object({
  issueCreate: z.object({
    success: z.boolean(),
    issue: z.object({ identifier: z.string(), url: z.url() }).nullable(),
  }),
})

/**
 * 작업 요청에서 고를 라벨·프로젝트·사이클. 묶음 라벨은 티켓에 바로 붙일 수 없고,
 * 끝나거나 취소된 프로젝트에는 새 일을 넣지 않아서 뺀다.
 */
export async function fetchRequestOptions(
  apiKey: string,
  fetchImpl: FetchImpl = fetch,
): Promise<RequestOptions> {
  const { teams } = await request(
    fetchImpl,
    apiKey,
    OPTIONS_QUERY,
    { teamKey: TEAM_KEY },
    optionsSchema,
  )
  const team = teams.nodes[0]
  if (!team) throw new LinearRequestError(`${TEAM_KEY} 팀을 찾지 못했어요.`)
  return {
    teamId: team.id,
    labels: team.labels.nodes
      .filter((l) => !l.isGroup)
      .map(({ id, name, color }) => ({ id, name, color })),
    projects: team.projects.nodes
      .filter((p) => p.state !== 'completed' && p.state !== 'canceled')
      .map((p) => ({ id: p.id, name: p.name, milestones: p.projectMilestones.nodes })),
    cycles: team.cycles.nodes,
  }
}

/** 팀에 티켓을 만든다. 값은 GraphQL 변수로만 넘겨 쿼리 글자에 섞지 않는다. */
export function linearIssueCreator(
  apiKey: string,
  teamId: string,
  fetchImpl: FetchImpl = fetch,
): IssueCreator {
  return async (issue) => {
    const { issueCreate } = await request(
      fetchImpl,
      apiKey,
      CREATE_MUTATION,
      { input: { teamId, ...issue } },
      createSchema,
    )
    if (!issueCreate.success || !issueCreate.issue) {
      throw new LinearRequestError('Linear가 티켓을 만들지 않았어요.')
    }
    return issueCreate.issue
  }
}
