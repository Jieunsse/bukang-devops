'use client'

import { Disclosure, Label, ListBox, Select } from '@heroui/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useState, type CSSProperties, type ReactNode } from 'react'

import {
  ALL,
  panelLabel,
  sectionHelp,
  sectionLabel,
  type Dashboard,
  type Panel,
} from '@/entities/grafana-dashboard'
import { report as s, ReportHeader } from '@/shared/ui'

import { isCoreSection, type DashboardLink } from '../model/dashboards'
import { gridOf } from '../model/layout'
import { RANGES, type RangeKey, type VariableState } from '../model/types'
import { MonitoringTabs } from './MonitoringTabs'
import {
  ChartCard,
  LEVEL_TEXT,
  SpecItem,
  StatCard,
  VerdictContext,
  type PanelVerdict,
} from './PanelCard'

// 그라파나 대시보드 하나를 옮긴 화면. 위에서 아래로 「판정 → 핵심 숫자 → 핵심 묶음 → 자세한 지표(접힘)」 순서다.
// 처음 보는 사람이 판정 카드부터 읽고, 기준을 넘은 항목을 누르면 그 패널로 내려간다.
// 변수와 기간을 바꾸면 주소가 바뀌고, 서버가 그 값으로 변수 목록을 다시 푼다.

export type DashboardViewData = {
  dashboard: Dashboard
  name: string
  links: DashboardLink[]
  variables: VariableState[]
  range: RangeKey
}

/** 패널 요청에 붙일 검색값. 고른 변수 값과 기간 */
function panelQuery(variables: VariableState[], range: RangeKey) {
  const p = new URLSearchParams({ range })
  for (const v of variables) for (const value of v.selected) p.append(`v.${v.name}`, value)
  return p.toString()
}

/** 대상 고르기 이름. 개발 용어(job, instance)는 그대로 두고 읽기 어려운 말만 바꾼다 */
const VARIABLE_NAMES: Record<string, string> = {
  'Trend Metrics Query': '추이 지표',
  'Test ID': '테스트 ID',
  Nodename: '노드 이름',
  name: '노드 이름',
  cluster: '클러스터',
  'JVM Memory Pools Heap': '힙 메모리 영역',
  'JVM Memory Pools Non-Heap': '힙 밖 메모리 영역',
  'JVM Buffer Pools': '버퍼 풀',
}

const isSpec = (p: Panel) => panelLabel(p).spec !== null
const isStat = (p: Panel) => !isSpec(p) && p.kind === 'stat'
const isChart = (p: Panel) => !isSpec(p) && p.kind !== 'stat'
/** 판정에 쓰는 패널: 그라파나 기준값이 있고, 이 서버에 맞지 않아 뺀 기준값이 아닌 것 */
const judged = (p: Panel) => !isSpec(p) && p.steps.length > 0 && !panelLabel(p).ignoreThresholds

export function DashboardView({ data }: { data: DashboardViewData }) {
  const router = useRouter()
  const { dashboard, variables, range } = data
  const query = panelQuery(variables, range)
  const sections = dashboard.sections.map((sec, i) => ({
    ...sec,
    key: `s${i}`,
    core: isCoreSection(dashboard.uid, sec.title, i),
  }))
  const core = sections.filter((sec) => sec.core)
  const detail = sections.filter((sec) => !sec.core)
  // 판정 옆 핵심 숫자: 숫자 패널이 있는 첫 핵심 묶음
  const hero = core.find((sec) => sec.panels.some(isStat))
  const specs = core.flatMap((sec) => sec.panels.filter(isSpec))
  const judgedCount = core.flatMap((sec) => sec.panels.filter(judged)).length

  const [results, setResults] = useState<Record<number, PanelVerdict>>({})
  const report = useCallback(
    (v: PanelVerdict) =>
      setResults((prev) => {
        const old = prev[v.id]
        return old && old.level === v.level && old.value === v.value ? prev : { ...prev, [v.id]: v }
      }),
    [],
  )

  const choose = (name: string, value: string) => {
    const next = variables.map((v) => (v.name === name ? { ...v, selected: [value] } : v))
    router.push(`/monitoring/${dashboard.uid}?${panelQuery(next, range)}`)
  }

  return (
    <VerdictContext.Provider value={report}>
      <div className={`${s.report} ${s.solo} ${s.mon}`}>
        <div className={`${s.page} ${s.wide} gap-8`}>
          <MonitoringTabs links={data.links} current={dashboard.uid} />
          <ReportHeader
            title={data.name}
            sub={`그라파나 「${dashboard.title}」 · 1분마다 갱신`}
            actions={
              <nav aria-label="기간" className={s.seg}>
                {(Object.keys(RANGES) as RangeKey[]).map((r) => (
                  <Link
                    key={r}
                    href={`/monitoring/${dashboard.uid}?${panelQuery(variables, r)}`}
                    aria-current={r === range ? 'page' : undefined}
                  >
                    {RANGES[r].label}
                  </Link>
                ))}
              </nav>
            }
          />

          {variables.length > 0 && (
            <div role="group" aria-label="대상 고르기" className="-mt-4 flex flex-wrap gap-3">
              {variables.map((v) => (
                <Select
                  key={v.name}
                  className="w-[calc(50%-6px)] text-base sm:w-56"
                  value={v.selected[0] ?? null}
                  placeholder="고르기"
                  onChange={(value) => value !== null && choose(v.name, String(value))}
                >
                  <Label>{VARIABLE_NAMES[v.label] ?? v.label}</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {v.includeAll ? (
                        <ListBox.Item id={ALL} textValue="전체">
                          전체
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ) : null}
                      {v.options.map((o) => (
                        <ListBox.Item key={o} id={o} textValue={o}>
                          {o}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <VerdictCard
              total={judgedCount}
              results={Object.values(results)}
              specs={specs.map((p) => (
                <SpecItem key={p.id} uid={dashboard.uid} panel={p} query={query} />
              ))}
              className={hero ? '' : 'lg:col-span-3'}
            />
            {hero && (
              <StatGrid
                uid={dashboard.uid}
                panels={hero.panels.filter(isStat)}
                query={query}
                max={4}
                className="lg:col-span-2"
                label={`${sectionLabel(hero.title).name} 숫자`}
              />
            )}
          </div>

          {core.map((sec) => {
            const panels =
              sec === hero ? sec.panels.filter(isChart) : sec.panels.filter((p) => !isSpec(p))
            if (panels.length === 0) return null
            return (
              <section
                key={sec.key}
                aria-label={sectionLabel(sec.title).name}
                className="flex flex-col gap-4"
              >
                <SectionHead title={sec.title} />
                <SectionPanels uid={dashboard.uid} panels={panels} query={query} eager />
              </section>
            )
          })}

          {detail.length > 0 && (
            <section aria-label="자세한 지표" className="flex flex-col gap-4">
              <header className="flex flex-col gap-1">
                <h3 className={s.tSection}>자세한 지표</h3>
                <p className={`${s.tSmall} m-0`}>
                  위에서 이상한 값을 찾았을 때 원인을 더 찾는 묶음이에요. 펼칠 때 불러와요.
                </p>
              </header>
              <div className={`${s.card} gap-0 p-0`}>
                {detail.map((sec, i) => (
                  <Disclosure
                    key={sec.key}
                    className={i > 0 ? 'border-t' : undefined}
                    style={{ borderColor: 'var(--line)' }}
                  >
                    <Disclosure.Heading>
                      <Disclosure.Trigger className="flex w-full items-center gap-4 px-6 py-4 text-left">
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          <span
                            className="text-base font-semibold"
                            title={sectionLabel(sec.title).original ?? undefined}
                          >
                            {sectionLabel(sec.title).name}
                          </span>
                          {sectionHelp(sec.title) && (
                            <span className={s.tSmall}>{sectionHelp(sec.title)}</span>
                          )}
                        </span>
                        <span className={`${s.tSmall} shrink-0`}>지표 {sec.panels.length}개</span>
                        <Disclosure.Indicator />
                      </Disclosure.Trigger>
                    </Disclosure.Heading>
                    <Disclosure.Content>
                      <div className="px-6 pb-6">
                        <SectionPanels uid={dashboard.uid} panels={sec.panels} query={query} />
                      </div>
                    </Disclosure.Content>
                  </Disclosure>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </VerdictContext.Provider>
  )
}

function SectionHead({ title }: { title: string }) {
  const label = sectionLabel(title)
  const help = sectionHelp(title)
  return (
    <header className="flex flex-col gap-1">
      <h3 className={s.tSection} title={label.original ?? undefined}>
        {label.name}
      </h3>
      {help && <p className={`${s.tSmall} m-0`}>{help}</p>}
    </header>
  )
}

/** 판정 카드. 기준을 넘은 핵심 지표를 먼저 보여 주고, 누르면 그 패널로 내려간다 */
function VerdictCard({
  total,
  results,
  specs,
  className,
}: {
  total: number
  results: PanelVerdict[]
  specs: ReactNode[]
  className: string
}) {
  const bad = results.filter((r) => r.level === 'bad')
  const warn = results.filter((r) => r.level === 'warn')
  const done = results.length >= total
  // 기준값이 있는 패널을 모두 받았는데 값이 하나도 없으면(부하 테스트를 돌리지 않은 때) 정상이 아니라 기록 없음이다
  const empty = done && results.every((r) => r.value === '-')
  const headline =
    total === 0
      ? '기준값 없음'
      : bad.length
        ? `주의 · ${bad.length}개`
        : !done
          ? '확인 중'
          : empty
            ? '기록 없음'
            : warn.length
              ? `기준 가까움 · ${warn.length}개`
              : '기준 넘은 값 없음'
  return (
    <section aria-label="판정" className={`${s.card} gap-4 ${className}`}>
      <span className={s.tLabel}>판정</span>
      <p className={`${s.tVerdict} ${bad.length ? 'text-danger' : ''}`}>{headline}</p>
      {bad.length + warn.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label="기준을 넘은 지표">
          {[...bad, ...warn].map((r) => (
            <li key={r.id}>
              <a
                href={`#panel-${r.id}`}
                className="flex items-baseline gap-2 rounded-md hover:underline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
              >
                <span
                  className={`${s.tLabel} w-16 shrink-0 ${r.level === 'bad' ? 'text-danger' : ''}`}
                >
                  {LEVEL_TEXT[r.level]}
                </span>
                <span className="min-w-0 truncate">{r.name}</span>
                <b className={`ml-auto tabular-nums ${r.level === 'bad' ? 'text-danger' : ''}`}>
                  {r.value}
                </b>
              </a>
            </li>
          ))}
        </ul>
      )}
      <p className={`${s.tSmall} m-0 mt-auto`}>
        {total > 0
          ? `핵심 지표 ${total}개를 그라파나 기준값으로 확인해요. 빨간 글자는 기준을 넘은 값이에요.`
          : '이 대시보드에는 그라파나 기준값이 정해진 지표가 없어요. 아래 그래프로 흐름을 봐요.'}
      </p>
      {specs.length > 0 && (
        <p className={`${s.tSmall} m-0 flex flex-wrap gap-x-3 gap-y-1`} aria-label="사양">
          {specs}
        </p>
      )}
    </section>
  )
}

/** 숫자 카드 격자. 줄마다 꽉 차게 열 수를 고르고, 높이는 줄마다 같다 */
function StatGrid({
  uid,
  panels,
  query,
  max,
  className = '',
  label,
  eager = true,
}: {
  uid: string
  panels: Panel[]
  query: string
  max: number
  className?: string
  label: string
  eager?: boolean
}) {
  const { cols, spanLast } = gridOf(panels.length, max)
  return (
    <div
      role="group"
      aria-label={label}
      className={`grid grid-cols-2 gap-4 lg:grid-cols-[repeat(var(--cols),minmax(0,1fr))] ${className}`}
      style={{ '--cols': cols, '--span': spanLast } as CSSProperties}
    >
      {panels.map((p, i) => {
        const last = i === panels.length - 1
        return (
          <StatCard
            key={p.id}
            uid={uid}
            panel={p}
            query={query}
            eager={eager}
            className={
              last
                ? `${panels.length % 2 ? 'max-lg:col-span-2' : ''} lg:[grid-column:span_var(--span)]`
                : ''
            }
          />
        )
      })}
    </div>
  )
}

/** 묶음 하나의 패널. 숫자 카드 격자, 그 아래 그래프 두 줄 격자(홀수면 마지막 그래프가 한 줄을 다 쓴다) */
function SectionPanels({
  uid,
  panels,
  query,
  eager = false,
}: {
  uid: string
  panels: Panel[]
  query: string
  eager?: boolean
}) {
  const stats = panels.filter(isStat)
  const charts = panels.filter((p) => !isStat(p))
  return (
    <div className="flex flex-col gap-4">
      {stats.length > 0 && (
        <StatGrid uid={uid} panels={stats} query={query} max={6} label="숫자" eager={eager} />
      )}
      {charts.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {charts.map((p, i) => (
            <div
              key={p.id}
              className={`min-w-0 ${charts.length % 2 && i === charts.length - 1 ? 'lg:col-span-2' : ''}`}
            >
              <ChartCard uid={uid} panel={p} query={query} eager={eager} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
