'use server'

import { refreshMonitoring } from '../model/explain-server'

/** 모니터링 새로고침. 지표 캐시를 비우고 AI 해석을 새로 받는다(서버 전체 1분에 한 번) */
export async function refreshMonitoringAction() {
  return refreshMonitoring()
}
