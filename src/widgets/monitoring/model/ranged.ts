import { DEFAULT_RANGE } from '@/shared/lib/time-range'

import type { MonitoringData, RangedMetrics } from './load'

// 서버 페이지와 화면이 함께 부르는 순수 함수라 클라이언트 모듈 밖에 둔다

/** 서버가 함께 받은 1시간 그래프. 요약·상세 탭이 기간 그래프의 첫 값으로 넘긴다 */
export const rangedOf = (data: Extract<MonitoringData, { status: 'ok' }>): RangedMetrics => ({
  range: DEFAULT_RANGE,
  trends: data.trends,
  brief: data.brief,
  partial: data.partial,
})
