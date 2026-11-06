'use server'

import { updateTag } from 'next/cache'

import { getLinearSource } from '../../config/env'
import { getSnapshot, SNAPSHOT_TAG } from '../linear/server'
import { linearIssueCreator } from './linear'
import { createWorkRequest, type IssueCreator } from './service'

// 키가 없는 로컬 개발 서버에서는 Linear에 보내지 않고 만든 척만 한다.
const fixtureCreator: IssueCreator = async () => ({
  identifier: 'BUK-예시',
  url: 'https://linear.app',
})

// 브라우저가 부르는 서버 함수. 비밀번호 확인과 Linear 호출은 서버에서만 한다.
export async function createWorkRequestAction(password: unknown, request: unknown) {
  const source = getLinearSource()
  const result = await createWorkRequest(
    {
      create: source.kind === 'live' ? linearIssueCreator(source.apiKey) : fixtureCreator,
      members: (await getSnapshot()).members ?? [],
      expectedPassword: process.env.SCHEDULE_PASSWORD,
    },
    password,
    request,
  )
  // 새 티켓이 대시보드에 바로 보이도록 서버 캐시를 비운다.
  if (result.ok) updateTag(SNAPSHOT_TAG)
  return result
}
