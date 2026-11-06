import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Member } from '../linear'
import { createWorkRequest, type IssueCreator } from './service'

const PASSWORD = 'team-secret'
const members: Member[] = [
  { id: 'u-jihoon', name: '옥지훈' },
  { id: 'u-yeongho', name: '영호' },
]
const input = {
  assigneeId: 'u-yeongho',
  requesterId: 'u-jihoon',
  title: '로그인 화면 문구 고치기',
  description: '버튼 문구를 「로그인」으로 바꿔 주세요.',
  dueDate: '2026-11-10',
}

let create: ReturnType<typeof vi.fn<IssueCreator>>
beforeEach(() => {
  create = vi.fn<IssueCreator>(async () => ({ identifier: 'BUK-99', url: 'https://linear.app/x' }))
})

const run = (given: unknown, request: unknown, expected: string | undefined = PASSWORD) =>
  createWorkRequest({ create, members, expectedPassword: expected }, given, request)

describe('작업 요청 만들기', () => {
  it.each([
    ['비밀번호 없음', undefined],
    ['틀린 비밀번호', 'wrong'],
    ['문자가 아닌 비밀번호', 1234],
  ])('%s이면 거절하고 Linear에 보내지 않는다', async (_, given) => {
    expect(await run(given, input)).toEqual({ ok: false, reason: 'password' })
    expect(create).not.toHaveBeenCalled()
  })

  it('서버에 비밀번호가 정해져 있지 않으면 거절한다', async () => {
    expect(await run('', input, undefined)).toEqual({ ok: false, reason: 'password' })
    expect(create).not.toHaveBeenCalled()
  })

  it('비밀번호가 맞으면 고른 팀원을 담당자로, 요청한 사람을 설명 끝에 적어 만든다', async () => {
    const result = await run(PASSWORD, { ...input, title: '  로그인 화면 문구 고치기  ' })
    expect(result).toEqual({ ok: true, identifier: 'BUK-99', url: 'https://linear.app/x' })
    expect(create).toHaveBeenCalledWith({
      title: '로그인 화면 문구 고치기',
      assigneeId: 'u-yeongho',
      dueDate: '2026-11-10',
      description:
        '버튼 문구를 「로그인」으로 바꿔 주세요.\n\n---\n요청한 사람: 옥지훈 (부캉이 작업 요청)',
    })
  })

  it('설명과 기한이 비어 있으면 요청한 사람만 적고 기한 없이 만든다', async () => {
    await run(PASSWORD, { ...input, description: '  ', dueDate: '' })
    expect(create).toHaveBeenCalledWith({
      title: input.title,
      assigneeId: 'u-yeongho',
      dueDate: null,
      description: '요청한 사람: 옥지훈 (부캉이 작업 요청)',
    })
  })

  it.each([
    ['팀에 없는 담당자', { ...input, assigneeId: 'u-stranger' }],
    ['팀에 없는 요청한 사람', { ...input, requesterId: 'u-stranger' }],
    ['빈 제목', { ...input, title: '   ' }],
    ['너무 긴 제목', { ...input, title: '가'.repeat(101) }],
    ['너무 긴 설명', { ...input, description: '가'.repeat(2001) }],
    ['달력에 없는 기한', { ...input, dueDate: '2026-02-30' }],
    ['빠진 칸', { title: '고치기' }],
  ])('%s이면 거절하고 Linear에 보내지 않는다', async (_, bad) => {
    expect(await run(PASSWORD, bad)).toEqual({ ok: false, reason: 'invalid' })
    expect(create).not.toHaveBeenCalled()
  })

  it('Linear가 실패하면 실패라고 알려 준다', async () => {
    create.mockRejectedValueOnce(new Error('Linear 요청 실패(400)'))
    vi.spyOn(console, 'error').mockImplementationOnce(() => {})
    expect(await run(PASSWORD, input)).toEqual({ ok: false, reason: 'failed' })
  })
})
