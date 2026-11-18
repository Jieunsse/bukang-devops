import { connection } from 'next/server'

import { listDashboards, readGrafanaConfig } from '@/shared/api/grafana/server'
import { report as s, ReportHeader } from '@/shared/ui'
import { toDashboardLinks } from '@/widgets/grafana-dashboard/model/dashboards'
import { MonitoringTabs } from '@/widgets/grafana-dashboard/ui/MonitoringTabs'
import { BriefSection, MonitoringView, SummaryTiles } from '@/widgets/monitoring'
import { loadMonitoring } from '@/widgets/monitoring/model/load'
import { getExplanation } from '@/widgets/monitoring/model/explain-server'
import { ExplainView } from '@/widgets/monitoring/ui/ExplainView'

// 요약 탭: 판정 칸 → AI 리포트 → 병목 흐름 6장. 서비스 표·추이·상태판은 「상세 지표」 탭에만 있다.
// 판정과 병목 흐름은 상세 지표 탭과 같은 부품·같은 계산 결과(loadMonitoring)를 써서 리포트 숫자와 같다.
// 그라파나 토큰과 Claude 키는 서버에서만 쓰고, 브라우저에는 계산한 지표와 리포트 문구만 내려 준다.
// AI 리포트를 처음 만들 때와 새로고침(서버 액션) 때 최대 60초 걸릴 수 있다
export const maxDuration = 90

export default async function MonitoringPage() {
  // 요청마다 그려서 AI 칸을 늦게 채운다(빌드 때 AI를 부르지 않는다)
  await connection()
  const config = readGrafanaConfig(process.env as Record<string, string | undefined>)
  const links = config
    ? await listDashboards(config)
        .then(toDashboardLinks)
        .catch(() => [])
    : []
  const data = await loadMonitoring()
  // 대시보드 목록을 못 받아도 상세 지표로 갈 수 있게 탭은 늘 그린다
  const tabs = <MonitoringTabs links={links} current={null} />
  // 지표를 못 받으면 리포트도 만들지 않는다(실패가 리포트 캐시에 남지 않게)
  if (data.status !== 'ok') return <MonitoringView data={data} tabs={tabs} />
  return (
    <div className={`${s.report} ${s.solo}`}>
      <div className={`${s.page} ${s.wide}`}>
        {tabs}
        <ReportHeader title="모니터링 리포트" />
        {/* 리포트 읽기는 기다리지 않고 넘긴다. 코드가 그리는 부분이 먼저 보이고 AI 칸만 늦게 채워진다 */}
        <SummaryTiles data={data} />
        <ExplainView explanation={getExplanation()} data={data} links={links} />
        <BriefSection cards={data.brief} />
      </div>
    </div>
  )
}
