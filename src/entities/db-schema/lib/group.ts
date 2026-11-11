import type { DbTable } from '../model/types'

/** 테이블 이름 앞부분으로 어느 서비스 테이블인지 정한다. 순서가 메뉴 순서다. */
const SERVICES = [
  { prefix: 'member_', label: '회원' },
  { prefix: 'product_', label: '상품' },
  { prefix: 'queue_', label: '대기열' },
  { prefix: 'order_', label: '주문' },
  { prefix: 'cash_', label: '예치금' },
  { prefix: 'payout_', label: '정산' },
  { prefix: 'notification_', label: '알림' },
  { prefix: 'file_', label: '파일' },
] as const

/** 앞부분 규칙을 따르지 않는 상품 서비스 테이블 */
const PRODUCT_EXTRA = new Set(['race', 'race_course', 'participation_hold'])

const SYSTEM = '시스템 기록'
const OTHER = '기타'

/** prefix는 목록에서 흐리게 보여 줄 공통 앞부분이다. 없으면 빈 문자열. */
export type DbTableGroup = { label: string; prefix: string; tables: DbTable[] }

export function serviceOf(name: string): string {
  if (PRODUCT_EXTRA.has(name)) return '상품'
  // Flyway 버전 기록과 Spring Batch 실행 기록은 서비스 데이터가 아니라 따로 모은다.
  if (name.startsWith('flyway_schema_history') || name.startsWith('BATCH_')) return SYSTEM
  return SERVICES.find((s) => name.startsWith(s.prefix))?.label ?? OTHER
}

export function groupByService(tables: DbTable[]): DbTableGroup[] {
  const order = [...SERVICES.map((s) => s.label), OTHER, SYSTEM]
  return order
    .map((label) => ({
      label,
      prefix: SERVICES.find((s) => s.label === label)?.prefix ?? '',
      tables: tables.filter((t) => serviceOf(t.name) === label),
    }))
    .filter((g) => g.tables.length > 0)
}
