import 'server-only'

import { z } from 'zod'

import { LinearRequestError, request, TEAM_KEY, type FetchImpl } from '../linear/fetch-snapshot'
import type { IssueCreator } from './service'

const TEAM_QUERY = `
  query Team($teamKey: String!) {
    teams(first: 1, filter: { key: { eq: $teamKey } }) { nodes { id } }
  }
`

const CREATE_MUTATION = `
  mutation Create($input: IssueCreateInput!) {
    issueCreate(input: $input) { success issue { identifier url } }
  }
`

const teamSchema = z.object({ teams: z.object({ nodes: z.array(z.object({ id: z.string() })) }) })
const createSchema = z.object({
  issueCreate: z.object({
    success: z.boolean(),
    issue: z.object({ identifier: z.string(), url: z.url() }).nullable(),
  }),
})

/** BUK 팀에 티켓을 만든다. 값은 GraphQL 변수로만 넘겨 쿼리 글자에 섞지 않는다. */
export function linearIssueCreator(apiKey: string, fetchImpl: FetchImpl = fetch): IssueCreator {
  return async (issue) => {
    const { teams } = await request(
      fetchImpl,
      apiKey,
      TEAM_QUERY,
      { teamKey: TEAM_KEY },
      teamSchema,
    )
    const teamId = teams.nodes[0]?.id
    if (!teamId) throw new LinearRequestError(`${TEAM_KEY} 팀을 찾지 못했어요.`)
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
