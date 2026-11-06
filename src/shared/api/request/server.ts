import 'server-only'

import { unstable_cache } from 'next/cache'

import { getLinearSource } from '../../config/env'
import { fetchRequestOptions } from './linear'
import type { RequestOptions } from './schema'

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
