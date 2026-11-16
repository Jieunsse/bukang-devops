'use server'

import { updateTag } from 'next/cache'

import { getLinearSource } from '../../config/env'
import { SNAPSHOT_TAG } from '../linear/server'
import { linearIssueCreator } from './linear'
import { getRequestLog, getRequestOptions } from './server'
import { createWorkRequest, type IssueCreator } from './service'

// 키가 없는 로컬 개발 서버에서는 Linear에 보내지 않고 만든 척만 한다.
const fixtureCreator: IssueCreator = async () => ({
  identifier: 'BUK-예시',
  url: 'https://linear.app',
})

/** 작업 요청 창에서 고를 라벨·프로젝트·사이클 */
export async function loadRequestOptionsAction() {
  return getRequestOptions()
}

/** 작업 요청 내역. 비밀번호 없이 누구나 본다. */
export async function loadRequestLogAction() {
  return getRequestLog()
}

// 브라우저가 부르는 서버 함수. 비밀번호 확인과 Linear 호출은 서버에서만 한다.
export async function createWorkRequestAction(password: unknown, request: unknown) {
  const source = getLinearSource()
  // 선택지와 같은 워크스페이스(CRU 키가 있으면 CRU, 없으면 BUK)에 만든다.
  const options = await getRequestOptions()
  const result = await createWorkRequest(
    {
      create:
        source.kind === 'live'
          ? linearIssueCreator(source.workspaces.at(-1)!.apiKey, options.teamId)
          : fixtureCreator,
      // 받는 사람 id는 티켓을 만드는 팀의 사용자 id라야 해서 그 팀 멤버로 확인한다.
      members: options.members,
      options,
      expectedPassword: process.env.SCHEDULE_PASSWORD,
    },
    password,
    request,
  )
  // 새 티켓이 대시보드에 바로 보이도록 서버 캐시를 비운다.
  if (result.ok) updateTag(SNAPSHOT_TAG)
  return result
}
