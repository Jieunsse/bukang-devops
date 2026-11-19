'use client'

import { CircleQuestion } from '@gravity-ui/icons'
import { Tooltip } from '@heroui/react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useRef, useState } from 'react'

import {
  formatUnit,
  levelOf,
  panelLabel,
  seriesLabel,
  type Panel,
  type ThresholdLevel,
} from '@/entities/grafana-dashboard'
import { seriesStats } from '@/shared/lib/chart'
import { cacheSecondsOf, parseRange } from '@/shared/lib/time-range'
import { report as s } from '@/shared/ui'
import { MAX_LINES, MultiLineChart, seriesColor } from '@/shared/ui/chart/MultiLineChart'

import type { SeriesData } from '../model/types'

// 그라파나 패널 하나. 화면에 보일 때 처음 불러온다(대시보드 하나에 패널이 100개가 넘는다).
// 숫자 패널은 이름 + 큰 숫자, 그래프 패널은 이름 + 읽는 법 한 줄 + 그래프 + 값 표(표가 범례를 겸한다).
// 그라파나 기준값의 빨강 단계를 넘은 지금 값은 빨간 「주의」, 그 아래 단계는 색 없는 「기준 가까움」으로 알린다.

/** 기준 단계 → 글자 표시. 빨강은 기준을 넘은 값(bad)에만 쓴다(CLAUDE.md 모니터링 예외) */
export const LEVEL_TEXT: Record<ThresholdLevel, string | null> = {
  ok: null,
  warn: '기준 가까움',
  bad: '주의',
}
const levelClass = (l: ThresholdLevel) => (l === 'bad' ? 'font-semibold text-danger' : undefined)
const worse = (a: ThresholdLevel, b: ThresholdLevel): ThresholdLevel =>
  a === 'bad' || b === 'bad' ? 'bad' : a === 'warn' || b === 'warn' ? 'warn' : 'ok'

/** 판정 카드로 보내는 패널 하나의 결과. 기준값이 있는 핵심 패널만 보낸다 */
export type PanelVerdict = { id: number; name: string; level: ThresholdLevel; value: string }
export const VerdictContext = createContext<((v: PanelVerdict) => void) | null>(null)

/** 화면에 들어온 뒤에만 true. eager면 처음부터 true(판정에 쓰는 핵심 패널) */
function useSeen<T extends Element>(eager: boolean) {
  const ref = useRef<T>(null)
  // IntersectionObserver가 없는 환경(테스트 등)에서는 바로 불러온다
  const [seen, setSeen] = useState(() => eager || typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    const io = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && setSeen(true),
      { rootMargin: '400px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [seen])
  return { ref, seen }
}

type PanelProps = { uid: string; panel: Panel; query: string; eager?: boolean }

/** 패널 값. 화면에 보일 때 처음 불러오고 1분마다 다시 받는다. eager면 판정 카드에 결과를 보낸다 */
function usePanelData<T extends Element>({ uid, panel, query, eager = false }: PanelProps) {
  const { ref, seen } = useSeen<T>(eager)
  // 서버 캐시와 같은 시간 동안 다시 받지 않는다. query 안의 range가 키라서 기간마다 따로 캐시된다
  const cacheMs = cacheSecondsOf(parseRange(new URLSearchParams(query).get('range'))) * 1000
  const result = useQuery({
    queryKey: ['grafana-panel', uid, panel.id, query],
    queryFn: async (): Promise<SeriesData> => {
      const res = await fetch(`/api/monitoring/panel?uid=${uid}&panel=${panel.id}&${query}`)
      if (!res.ok) throw new Error(String(res.status))
      return res.json() as Promise<SeriesData>
    },
    enabled: seen,
    staleTime: cacheMs,
    refetchInterval: cacheMs,
    // 기간을 바꾸는 동안 이전 그래프를 두어 빈 칸으로 깜빡이지 않게 한다
    placeholderData: keepPreviousData,
  })
  const label = panelLabel(panel)
  const steps = label.ignoreThresholds ? [] : panel.steps
  const level = (v: number | null): ThresholdLevel =>
    v === null || !steps.length ? 'ok' : levelOf(steps, v)
  const format = (v: number) => formatUnit(v, panel.unit, panel.decimals)

  // 지금 값이 가장 나쁜 시계열. 머리 표시와 판정 카드에 쓴다
  const latest = (result.data?.series ?? []).map((x) => seriesStats(x.points).latest)
  const worst = latest.reduce<ThresholdLevel>((a, v) => worse(a, level(v)), 'ok')
  const worstValue = latest.find((v) => level(v) === worst) ?? null

  const report = useContext(VerdictContext)
  const reportable = eager && steps.length > 0 && result.data !== undefined && report !== null
  const valueText = worstValue === null ? '-' : format(worstValue)
  useEffect(() => {
    if (reportable) report({ id: panel.id, name: label.name, level: worst, value: valueText })
  }, [reportable, report, panel.id, label.name, worst, valueText])

  return { ref, seen, ...result, label, level, format, worst }
}

/** 이름 옆 아이콘. 그라파나 원래 이름을 알려 준다(그라파나에서 같은 패널을 찾을 때) */
function OriginalTip({ name, original }: { name: string; original: string | null }) {
  if (!original) return null
  return (
    <Tooltip delay={200} closeDelay={0}>
      <Tooltip.Trigger aria-label={`${name} 그라파나 이름`} className="inline-flex text-muted">
        <CircleQuestion aria-hidden className="size-4" />
      </Tooltip.Trigger>
      <Tooltip.Content className="max-w-72 text-xs">그라파나 이름: {original}</Tooltip.Content>
    </Tooltip>
  )
}

function LevelBadge({ level }: { level: ThresholdLevel }) {
  const text = LEVEL_TEXT[level]
  if (!text) return null
  return (
    <span className={`${s.tLabel} shrink-0 ${level === 'bad' ? 'text-danger' : ''}`}>{text}</span>
  )
}

const Status = ({ text, tall }: { text: string; tall?: boolean }) => (
  <p className={`${s.tSmall} m-0 ${tall ? 'py-16 text-center' : ''}`}>{text}</p>
)

/** 숫자 패널. 이름 + 큰 숫자. 값이 여러 개면 가로로 나란히 놓는다 */
export function StatCard({ className = '', ...props }: PanelProps & { className?: string }) {
  const { ref, seen, data, isPending, isError, label, level, format } =
    usePanelData<HTMLElement>(props)
  return (
    <section
      ref={ref}
      id={`panel-${props.panel.id}`}
      aria-label={label.name}
      className={`${s.card} scroll-mt-4 justify-between gap-2 ${className}`}
    >
      <h4 className={`${s.tLabel} m-0 flex items-center gap-1`}>
        <span className="truncate" title={label.help ?? undefined}>
          {label.name}
        </span>
        <OriginalTip name={label.name} original={label.original} />
      </h4>
      {!seen || isPending ? (
        <Status text="불러오는 중" />
      ) : isError || data.failed ? (
        <Status text="불러오지 못했어요" />
      ) : data.series.length === 0 ? (
        <Status text="기록 없음" />
      ) : (
        <StatValues data={data} format={format} level={level} />
      )}
    </section>
  )
}

/** 사양 값 하나(「코어 2」). 판정 카드 아래 사양 한 줄에 들어간다 */
export function SpecItem(props: PanelProps) {
  const { ref, data, label, format } = usePanelData<HTMLSpanElement>(props)
  const v = data && !data.failed ? (seriesStats(data.series[0]?.points ?? []).latest ?? null) : null
  return (
    <span ref={ref} className="whitespace-nowrap">
      {label.spec ?? label.name}{' '}
      <b className="font-semibold text-foreground tabular-nums">{v === null ? '-' : format(v)}</b>
    </span>
  )
}

/** 그래프 패널. 이름과 읽는 법 한 줄, 그래프, 시계열마다 지금·평균·최대 표 */
export function ChartCard(props: PanelProps) {
  const { ref, seen, data, isPending, isError, label, level, format, worst } =
    usePanelData<HTMLElement>(props)
  const [highlight, setHighlight] = useState<number | null>(null)
  const series = (data?.series ?? []).map((x) => ({ ...x, name: seriesLabel(x.name) }))
  return (
    <section
      ref={ref}
      id={`panel-${props.panel.id}`}
      aria-label={label.name}
      className={`${s.card} h-full scroll-mt-4 overflow-hidden`}
    >
      <header className="flex flex-col gap-1">
        <h4 className="m-0 flex items-center gap-2 text-base font-semibold">
          <span className="min-w-0 truncate">{label.name}</span>
          <OriginalTip name={label.name} original={label.original} />
          <span className="ml-auto" />
          <LevelBadge level={worst} />
        </h4>
        {label.help && <p className={`${s.tSmall} m-0`}>{label.help}</p>}
      </header>
      {!seen || isPending ? (
        <Status text="불러오는 중이에요" tall />
      ) : isError || data.failed ? (
        <Status text="이 그래프를 불러오지 못했어요" tall />
      ) : series.length === 0 ? (
        <Status text="이 기간에 기록이 없어요" tall />
      ) : props.panel.kind === 'stat' ? (
        <StatValues data={{ ...data, series }} format={format} level={level} />
      ) : (
        <>
          <MultiLineChart
            title={label.name}
            series={series}
            format={format}
            legend={false}
            highlight={highlight}
          />
          <SeriesTable
            title={label.name}
            data={{ ...data, series }}
            format={format}
            level={level}
            onHighlight={setHighlight}
          />
        </>
      )}
    </section>
  )
}

function StatValues({
  data,
  format,
  level,
}: {
  data: SeriesData
  format: (v: number) => string
  level: (v: number | null) => ThresholdLevel
}) {
  const many = data.series.length > 1
  return (
    <dl className="m-0 flex flex-wrap gap-x-6 gap-y-2">
      {data.series.slice(0, 6).map((x, i) => {
        const v = seriesStats(x.points).latest
        const l = level(v)
        const text = v === null ? '-' : format(v)
        // 날짜처럼 긴 값은 큰 숫자 크기로 쓰면 카드 안에서 여러 줄로 꺾여 한 단계 작게 쓴다
        const size = many || text.length > 10 ? 'text-xl leading-7 font-bold' : s.tNum
        return (
          <div key={i} className="min-w-0">
            {many && <dt className={`${s.tSmall} truncate`}>{seriesLabel(x.name)}</dt>}
            <dd
              className={`m-0 flex flex-wrap items-baseline gap-x-2 ${size} tabular-nums ${levelClass(l) ?? ''}`}
            >
              <span className="whitespace-nowrap">{text}</span>
              <LevelBadge level={l} />
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

function SeriesTable({
  title,
  data,
  format,
  level,
  onHighlight,
}: {
  title: string
  data: SeriesData
  format: (v: number) => string
  level: (v: number | null) => ThresholdLevel
  onHighlight: (i: number | null) => void
}) {
  const f = (v: number | null) => (v === null ? '-' : format(v))
  return (
    <div className={`${s.tbl} max-h-64 overflow-y-auto`} onPointerLeave={() => onHighlight(null)}>
      <table aria-label={`${title} 값`} className="w-full table-fixed" style={{ minWidth: 0 }}>
        <thead>
          <tr>
            <th className="w-1/2">시계열</th>
            <th className={s.num}>지금</th>
            <th className={s.num}>평균</th>
            <th className={s.num}>최대</th>
          </tr>
        </thead>
        <tbody>
          {data.series.map((x, i) => {
            const st = seriesStats(x.points)
            const drawn = i < MAX_LINES
            return (
              <tr key={i} onPointerEnter={() => onHighlight(drawn ? i : null)}>
                <td>
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: drawn ? seriesColor(i) : 'transparent' }}
                    />
                    <span className="truncate" title={x.name}>
                      {x.name}
                    </span>
                  </span>
                </td>
                <td className={`${s.num} ${levelClass(level(st.latest)) ?? ''}`}>{f(st.latest)}</td>
                <td className={s.num}>{f(st.avg)}</td>
                <td className={s.num}>{f(st.max)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {(data.series.length > MAX_LINES || data.hiddenCount > 0) && (
        <p className={`${s.tSmall} m-0 border-t px-4 py-2`} style={{ borderColor: 'var(--line)' }}>
          그래프에는 앞의 {MAX_LINES}개만 그렸어요.
          {data.hiddenCount > 0 && ` 너무 많아 ${data.hiddenCount}개는 표에서도 뺐어요.`}
        </p>
      )}
    </div>
  )
}
