import 'server-only'

import {
  ALL,
  interpolate,
  legendName,
  parseDashboard,
  type Dashboard,
  type Panel,
  type VariableValues,
} from '@/entities/grafana-dashboard'
import {
  getDashboardJson,
  labelValues,
  queryPrometheusRange,
  type GrafanaConfig,
} from '@/shared/api/grafana/server'

import {
  RANGES,
  type RangeKey,
  type SelectedValues,
  type SeriesData,
  type VariableState,
} from './types'

// 그라파나 대시보드를 읽고, 변수 값을 풀고, 패널 하나의 질의를 실행한다.
// 브라우저는 PromQL을 보내지 않는다. 대시보드·패널 번호와 변수 값만 보내고, 값은 실제 목록에 있을 때만 쓴다.

/** 프로메테우스 수집 주기(운영 prometheus.yml의 scrape_interval) */
const SCRAPE_SECONDS = 15
/** 한 그래프에 그리는 시계열 수 상한. 넘는 시계열은 표에만 남긴다 */
const MAX_SERIES = 50

export async function loadDashboard(config: GrafanaConfig, uid: string): Promise<Dashboard> {
  return parseDashboard(uid, await getDashboardJson(config, uid))
}

/** 변수를 앞에서부터 차례로 푼다. 뒤 변수의 질의가 앞 변수 값을 쓰기 때문이다 */
export async function resolveVariables(
  config: GrafanaConfig,
  dashboard: Dashboard,
  selected: SelectedValues,
  range: RangeKey,
): Promise<{ states: VariableState[]; values: VariableValues }> {
  const end = Math.floor(Date.now() / 1000 / 60) * 60
  const window = { start: end - RANGES[range].seconds, end }
  const time = timeMacros(range)
  const values: VariableValues = {}
  const states: VariableState[] = []

  for (const v of dashboard.variables) {
    let options: string[] = []
    try {
      if (v.query.kind === 'labelValues') {
        const selector = v.query.selector ? interpolate(v.query.selector, values, time) : null
        options = await labelValues(config, v.query.label, selector, window)
      } else {
        const pattern = new RegExp(v.query.pattern)
        options = (await labelValues(config, '__name__', null, window)).filter((n) =>
          pattern.test(n),
        )
      }
    } catch (e) {
      console.error(
        `[grafana] 변수 ${v.name} 불러오기 실패: ${e instanceof Error ? e.message : String(e)}`,
      )
    }
    options = [...new Set(options)].sort()

    // 목록에 없는 값은 버린다. 아무것도 남지 않으면 「전체」 또는 첫 값을 고른다
    // 같은 값을 여러 번 보내 질의를 키우지 못하게 중복을 없애고, 「전체」는 허용한 변수에만 받는다
    const wanted = [...new Set(selected[v.name] ?? [])].filter(
      (s) => (s === ALL && v.includeAll) || options.includes(s),
    )
    const picked = wanted.length
      ? v.multi
        ? wanted
        : wanted.slice(0, 1)
      : v.includeAll
        ? [ALL]
        : options.slice(0, 1)
    states.push({
      name: v.name,
      label: v.label,
      multi: v.multi,
      includeAll: v.includeAll,
      options,
      selected: picked,
    })
    // 「전체」는 allValue(보통 .*)가 있으면 그 정규식을, 없으면 모든 값을 쓴다
    values[v.name] = picked.includes(ALL) ? (v.allValue ? [v.allValue] : options) : picked
  }
  return { states, values }
}

export function timeMacros(range: RangeKey) {
  return {
    stepSeconds: RANGES[range].step,
    rangeSeconds: RANGES[range].seconds,
    scrapeSeconds: SCRAPE_SECONDS,
  }
}

export function findPanel(dashboard: Dashboard, panelId: number): Panel | null {
  for (const s of dashboard.sections) {
    const p = s.panels.find((x) => x.id === panelId)
    if (p) return p
  }
  return null
}

/** 패널의 질의를 모두 실행해 시계열로 돌려준다. 질의마다 따로 실패한다 */
export async function queryPanel(
  config: GrafanaConfig,
  panel: Panel,
  values: VariableValues,
  range: RangeKey,
): Promise<SeriesData> {
  const { seconds, step } = RANGES[range]
  const end = Math.floor(Date.now() / 1000 / step) * step
  const time = timeMacros(range)
  const results = await Promise.all(
    panel.targets.map(async (t) => {
      try {
        const rows = await queryPrometheusRange(config, interpolate(t.expr, values, time), {
          start: end - seconds,
          end,
          step,
        })
        return rows.map((r) => ({
          name: legendName(t.legend, r.labels),
          labels: r.labels,
          points: r.points.map(([ts, v]): [number, number | null] => [
            ts,
            Number.isFinite(v) ? v : null,
          ]),
        }))
      } catch (e) {
        console.error(
          `[grafana] 패널 ${panel.id} 질의 실패: ${e instanceof Error ? e.message : String(e)}`,
        )
        return null
      }
    }),
  )
  const series = results.flatMap((r) => r ?? [])
  return {
    series: series.slice(0, MAX_SERIES),
    hiddenCount: Math.max(0, series.length - MAX_SERIES),
    failed: results.every((r) => r === null),
  }
}
