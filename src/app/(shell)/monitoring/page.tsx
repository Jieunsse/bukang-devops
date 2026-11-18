import { connection } from 'next/server'
import { Suspense } from 'react'

import { listDashboards, readGrafanaConfig } from '@/shared/api/grafana/server'
// 서버 컴포넌트라 클라이언트 모듈(@/shared/ui)을 거치지 않고 CSS 모듈을 직접 가져온다(거치면 클래스 이름이 비어 있다)
import s from '@/shared/ui/report/report.module.css'
import { toDashboardLinks } from '@/widgets/grafana-dashboard/model/dashboards'
import { MonitoringTabs } from '@/widgets/grafana-dashboard/ui/MonitoringTabs'
import { BriefSection, MonitoringView, SummaryTiles } from '@/widgets/monitoring'
import { getExplanation } from '@/widgets/monitoring/model/explain-server'
import { loadMonitoring } from '@/widgets/monitoring/model/load'
import { AiSummaryLine, ExplainView, ReportControls } from '@/widgets/monitoring/ui/ExplainView'

// 요약 탭. 시선 순서: 머리(제목·기준 시각·새로고침) → 판정 띠(판정·한 줄 요약·숫자 넷) → AI 리포트 → 병목 흐름 6장.
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
  // 리포트 읽기는 기다리지 않고 넘긴다. 코드가 그리는 부분이 먼저 보이고 AI 칸만 늦게 채워진다
  const explanation = getExplanation()
  return (
    <div className={`${s.report} ${s.solo} ${s.mon}`}>
      <div className={`${s.page} ${s.wide} gap-8`}>
        {tabs}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <h2 className={s.tPage}>모니터링 리포트</h2>
          <Suspense fallback={null}>
            <ReportControls explanation={explanation} />
          </Suspense>
        </header>
        <SummaryTiles
          data={data}
          summary={
            <Suspense fallback={<p className={`${s.tSmall} m-0`}>요약을 만드는 중이에요</p>}>
              <AiSummaryLine explanation={explanation} />
            </Suspense>
          }
        />
        <ExplainView explanation={explanation} data={data} links={links} />
        <BriefSection cards={data.brief} />
      </div>
    </div>
  )
}
