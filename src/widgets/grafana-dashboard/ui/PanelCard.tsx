'use client'

import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

import {
  formatUnit,
  levelOf,
  panelLabel,
  type Panel,
  type ThresholdLevel,
} from '@/entities/grafana-dashboard'
import { seriesStats } from '@/shared/lib/chart'
import { report as s } from '@/shared/ui'
import { MAX_LINES, MultiLineChart, seriesColor } from '@/shared/ui/chart/MultiLineChart'

import type { SeriesData } from '../model/types'

// 그라파나 패널 하나. 화면에 보일 때 처음 불러온다(대시보드 하나에 패널이 100개가 넘는다).
// 그래프 아래에 시계열마다 지금·평균·최대를 표로 붙인다. 숫자 패널(stat)은 큰 숫자로 보여 준다.
// 영어 이름은 뜻으로 바꾸고 읽는 법 한 줄을 붙인다. 그라파나 기준값의 빨강 단계를 넘은 지금 값은
// 요약 화면과 같은 말로 빨간 「주의」, 그 아래 단계는 색 없는 「기준 가까움」으로 알린다.

/** 기준 단계 → 글자 표시. 빨강은 기준을 넘은 값(bad)에만 쓴다(CLAUDE.md 모니터링 예외) */
const LEVEL_TEXT: Record<ThresholdLevel, string | null> = {
  ok: null,
  warn: '기준 가까움',
  bad: '주의',
}
const levelClass = (l: ThresholdLevel) => (l === 'bad' ? 'font-semibold text-danger' : undefined)

/** 화면에 들어온 뒤에만 true. 한 번 보이면 계속 true다 */
function useSeen<T extends Element>() {
  const ref = useRef<T>(null)
  // IntersectionObserver가 없는 환경(테스트 등)에서는 바로 불러온다
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === 'undefined')
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

export function PanelCard({ uid, panel, query }: { uid: string; panel: Panel; query: string }) {
  const { ref, seen } = useSeen<HTMLElement>()
  const { data, isPending, isError } = useQuery({
    queryKey: ['grafana-panel', uid, panel.id, query],
    queryFn: async (): Promise<SeriesData> => {
      const res = await fetch(`/api/monitoring/panel?uid=${uid}&panel=${panel.id}&${query}`)
      if (!res.ok) throw new Error(String(res.status))
      return res.json() as Promise<SeriesData>
    },
    enabled: seen,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
  const format = (v: number) => formatUnit(v, panel.unit, panel.decimals)
  const label = panelLabel(panel)
  const steps = label.ignoreThresholds ? [] : panel.steps
  const level = (v: number | null): ThresholdLevel =>
    v === null || !steps.length ? 'ok' : levelOf(steps, v)
  const wide = panel.kind !== 'stat'
  // 패널 머리에 붙일 가장 나쁜 단계(지금 값 기준)
  const worst = (data?.series ?? [])
    .map((x) => level(seriesStats(x.points).latest))
    .reduce<ThresholdLevel>(
      (a, b) => (a === 'bad' || b === 'bad' ? 'bad' : a === 'warn' || b === 'warn' ? 'warn' : 'ok'),
      'ok',
    )

  return (
    <section
      ref={ref}
      aria-label={panel.title}
      className={`${s.fact} min-h-40 gap-3 p-4 ${wide ? 'lg:col-span-2' : ''}`}
    >
      <header className="flex flex-col gap-0.5">
        <h4 className="m-0 flex flex-wrap items-baseline gap-x-2 text-sm font-semibold">
          {label.name}
          {label.original && <small className="font-normal text-muted">{label.original}</small>}
          {LEVEL_TEXT[worst] && (
            <span className={levelClass(worst) ?? 'font-normal text-muted'}>
              {LEVEL_TEXT[worst]}
            </span>
          )}
        </h4>
        {label.help && <p className="m-0 text-xs text-muted">{label.help}</p>}
      </header>
      {!seen || isPending ? (
        <p className="m-0 py-10 text-center text-sm text-muted">불러오는 중이에요</p>
      ) : isError || data.failed ? (
        <p className="m-0 py-10 text-center text-sm text-muted">이 그래프를 불러오지 못했어요</p>
      ) : data.series.length === 0 ? (
        <p className="m-0 py-10 text-center text-sm text-muted">이 기간에 기록이 없어요</p>
      ) : panel.kind === 'stat' ? (
        <StatValues data={data} format={format} level={level} />
      ) : (
        <>
          <MultiLineChart title={label.name} series={data.series} format={format} />
          <SeriesTable title={label.name} data={data} format={format} level={level} />
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
  return (
    <dl className="m-0 grid gap-2">
      {data.series.slice(0, 6).map((x, i) => (
        <div key={i} className="min-w-0">
          {data.series.length > 1 && <dt className="truncate text-xs text-muted">{x.name}</dt>}
          {(() => {
            const v = seriesStats(x.points).latest
            const l = level(v)
            return (
              <dd
                className={`m-0 text-3xl font-bold tracking-tight tabular-nums ${levelClass(l) ?? ''}`}
              >
                {v === null ? '-' : format(v)}
                {LEVEL_TEXT[l] && (
                  <span className="ml-2 text-sm font-semibold">{LEVEL_TEXT[l]}</span>
                )}
              </dd>
            )
          })()}
        </div>
      ))}
    </dl>
  )
}

function SeriesTable({
  title,
  data,
  format,
  level,
}: {
  title: string
  data: SeriesData
  format: (v: number) => string
  level: (v: number | null) => ThresholdLevel
}) {
  const f = (v: number | null) => (v === null ? '-' : format(v))
  return (
    <div className={`${s.tbl} max-h-64 overflow-y-auto`}>
      <table aria-label={`${title} 값`} style={{ minWidth: 0 }}>
        <thead>
          <tr>
            <th>시계열</th>
            <th className={s.num}>지금</th>
            <th className={s.num}>평균</th>
            <th className={s.num}>최대</th>
          </tr>
        </thead>
        <tbody>
          {data.series.map((x, i) => {
            const st = seriesStats(x.points)
            return (
              <tr key={i}>
                <td className="max-w-80">
                  <span className="flex items-center gap-1.5">
                    {i < MAX_LINES && (
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: seriesColor(i) }}
                      />
                    )}
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
        <p
          className="m-0 border-t px-4 py-2 text-xs text-muted"
          style={{ borderColor: 'var(--line)' }}
        >
          그래프에는 앞의 {MAX_LINES}개만 그렸어요.
          {data.hiddenCount > 0 && ` 너무 많아 ${data.hiddenCount}개는 표에서도 뺐어요.`}
        </p>
      )}
    </div>
  )
}
