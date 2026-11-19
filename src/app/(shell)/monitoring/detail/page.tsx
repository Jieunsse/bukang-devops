import { connection } from 'next/server'

import { listDashboards, readGrafanaConfig } from '@/shared/api/grafana/server'
import { toDashboardLinks } from '@/widgets/grafana-dashboard/model/dashboards'
import { MonitoringTabs } from '@/widgets/grafana-dashboard/ui/MonitoringTabs'
import { MonitoringView } from '@/widgets/monitoring'
import { loadMonitoring } from '@/widgets/monitoring/model/load'

// 상세 지표: 판정·숫자 칸, 병목 카드, 서비스 표, 추이, 상태판. AI 리포트는 요약 탭에 있다.
export default async function MonitoringDetailPage() {
  await connection()
  const config = readGrafanaConfig(process.env as Record<string, string | undefined>)
  const links = config
    ? await listDashboards(config)
        .then(toDashboardLinks)
        .catch(() => [])
    : []
  // 판정·표·상태판은 지금 상태라 기간과 상관없다. 기간 그래프는 화면이 주소의 range로 따로 받는다
  return (
    <MonitoringView
      data={await loadMonitoring()}
      // 대시보드 목록을 못 받아도 요약으로 돌아갈 수 있게 탭은 늘 그린다
      tabs={<MonitoringTabs links={links} current="detail" />}
    />
  )
}
