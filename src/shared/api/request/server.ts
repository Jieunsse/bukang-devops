import 'server-only'

import { unstable_cache } from 'next/cache'

import { getLinearSource } from '../../config/env'
import { getSnapshot, SNAPSHOT_TAG } from '../linear/server'
import { fetchRequestLog, fetchRequestOptions } from './linear'
import type { RequestLogEntry, RequestOptions } from './schema'
import { withRequesterAvatars } from './service'

const TEN_MINUTES = 600

// 키가 없는 로컬 개발 서버에서 쓰는 예시 선택지
const FIXTURE_OPTIONS: RequestOptions = {
  teamId: 'team-buk',
  labels: [
    { id: 'l-bug', name: 'Bug', color: '#eb5757' },
    { id: 'l-feature', name: 'Feature', color: '#bb87fc' },
    { id: 'l-improvement', name: 'Improvement', color: '#4ea7fc' },
  ],
  projects: [
    {
      id: 'p-final',
      name: '크루런 최종프로젝트',
      milestones: [
        { id: 'm-1', name: '핵심 기능' },
        { id: 'm-2', name: '발표 준비' },
      ],
    },
  ],
  cycles: [
    {
      id: 'c-1',
      number: 1,
      name: null,
      startsAt: '2026-11-08T15:00:00.000Z',
      endsAt: '2026-11-15T15:00:00.000Z',
    },
  ],
}

/** 라벨·프로젝트·사이클은 자주 바뀌지 않아서 서버 전체가 10분 동안 나눠 쓴다. */
export const getRequestOptions: () => Promise<RequestOptions> = unstable_cache(
  async () => {
    const source = getLinearSource()
    return source.kind === 'live' ? fetchRequestOptions(source.apiKey) : FIXTURE_OPTIONS
  },
  ['request-options-v1'],
  { revalidate: TEN_MINUTES },
)

// 키가 없는 로컬 개발 서버에서 쓰는 예시 내역
const FIXTURE_LOG: RequestLogEntry[] = [
  {
    identifier: 'BUK-예시',
    title: '배포 서버 메모리 늘리기',
    url: 'https://linear.app',
    createdAt: '2026-11-07T01:00:00.000Z',
    requester: '옥지훈',
    assignee: { name: '김호빈', avatarUrl: null },
    state: { id: 's-todo', name: 'Todo', type: 'unstarted', position: 1 },
  },
]

/** 작업 요청 내역. 새 요청을 만들면 대시보드와 같은 태그로 비워 바로 보인다. */
export const getRequestLog: () => Promise<RequestLogEntry[]> = unstable_cache(
  async () => {
    const source = getLinearSource()
    const [log, snapshot] = await Promise.all([
      source.kind === 'live' ? fetchRequestLog(source.apiKey) : FIXTURE_LOG,
      getSnapshot(),
    ])
    return withRequesterAvatars(log, snapshot.members ?? [])
  },
  ['request-log-v2'],
  { revalidate: TEN_MINUTES, tags: [SNAPSHOT_TAG] },
)
