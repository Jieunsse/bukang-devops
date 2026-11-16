import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { DbTableGroup } from '@/entities/db-schema'

import { DbSchemaView } from './DbSchemaView'

// ERD 캔버스는 브라우저 그리기 기능이 필요해 테스트에서는 뺀다
vi.mock('./DbErdView', () => ({ DbErdView: () => <div>ERD 캔버스</div> }))

const column = { type: 'bigint', nullable: false, default: null, extra: '', comment: '' }
const groups: DbTableGroup[] = [
  {
    label: '회원',
    prefix: 'member_',
    tables: [
      {
        name: 'member_member',
        comment: '회원',
        columns: [{ ...column, name: 'id', key: 'PRI', extra: 'auto_increment' }],
        indexes: [{ name: 'PRIMARY', unique: true, columns: ['id'] }],
        foreignKeys: [],
      },
      {
        name: 'member_crew',
        comment: '',
        columns: [{ ...column, name: 'leader_id', key: 'MUL' }],
        indexes: [],
        foreignKeys: [
          { name: 'fk', column: 'leader_id', refTable: 'member_member', refColumn: 'id' },
        ],
      },
    ],
  },
]

describe('DB 구조', () => {
  it('처음에는 개요에 테이블 수가 보이고, 테이블을 고르면 컬럼과 외래 키가 보인다', async () => {
    const user = userEvent.setup()
    render(<DbSchemaView database="bukang" dumpedAt="2026-11-11T00:00:00Z" groups={groups} />)
    expect(screen.getByRole('heading', { name: 'DB 구조' })).toBeInTheDocument()
    const toc = screen.getByRole('navigation', { name: 'DB 구조 목차' })
    await user.click(within(toc).getByRole('button', { name: 'member_crew' }))
    expect(screen.getByRole('table', { name: 'member_crew 컬럼' })).toBeInTheDocument()
    expect(screen.getByText('member_member.id')).toBeInTheDocument()
  })

  it('테이블 찾기에 맞는 테이블만 목차에 남는다', async () => {
    const user = userEvent.setup()
    render(<DbSchemaView database="bukang" dumpedAt="2026-11-11T00:00:00Z" groups={groups} />)
    await user.type(screen.getByRole('searchbox', { name: '테이블 찾기' }), 'crew')
    const toc = screen.getByRole('navigation', { name: 'DB 구조 목차' })
    expect(within(toc).getByRole('button', { name: 'member_crew' })).toBeInTheDocument()
    expect(within(toc).queryByRole('button', { name: 'member_member' })).not.toBeInTheDocument()
  })
})
