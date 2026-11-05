import 'server-only'

import { addDays } from '../../lib/date'
import { doneIssuesResponseSchema, doneRangeSchema, type DoneIssue } from './done-schema'
import { paginate } from './fetch-snapshot'

/** 한국 날짜 하루가 시작하는 시각 */
const kstMidnight = (date: string) => new Date(`${date}T00:00:00+09:00`).toISOString()

// 시각은 검증한 날짜로 만든 ISO 문자열만 넣는다. paginate가 teamKey와 after만 넘겨서 변수 대신 쓴다.
const doneQuery = (from: string, until: string) => `
  query DoneIssues($teamKey: String!, $after: String) {
    issues(
      first: 100
      after: $after
      # Linear는 닫힌 지 오래된 티켓을 자동으로 보관한다. 지난 기간을 고르면 그 티켓도 받아야 한다.
      includeArchived: true
      filter: {
        team: { key: { eq: $teamKey } }
        or: [
          { state: { type: { eq: "completed" } }, completedAt: { gte: "${from}", lt: "${until}" } }
          { state: { type: { eq: "canceled" } }, canceledAt: { gte: "${from}", lt: "${until}" } }
        ]
      }
    ) {
      nodes {
        id identifier title url dueDate startedAt completedAt canceledAt
        state { name type }
        assignee { id name avatarUrl }
        labels(first: 20) { nodes { id name } }
        projectMilestone { id name progress }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`

type FetchImpl = (url: string, init: RequestInit) => Promise<Response>

/** BUK 팀에서 고른 기간(한국 날짜, 양 끝 포함)에 완료하거나 취소한 티켓. 늦게 닫힌 순이다. */
export async function fetchDone(
  apiKey: string,
  range: unknown,
  fetchImpl: FetchImpl = fetch,
): Promise<DoneIssue[]> {
  const { start, end } = doneRangeSchema.parse(range)
  const query = doneQuery(kstMidnight(start), kstMidnight(addDays(end, 1)))
  const issues = await paginate(fetchImpl, apiKey, query, doneIssuesResponseSchema, (d) => d.issues)
  return issues.sort((a, b) => b.closedAt.localeCompare(a.closedAt))
}
