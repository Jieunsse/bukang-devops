'use client'

import { useState } from 'react'

import {
  CLUES,
  CONCLUSIONS,
  CONDITIONS,
  LOAD,
  MEASURED_AT,
  SMOKE,
  type Grade,
  type LoadResult,
  type ServiceId,
} from '@/entities/performance'

import s from './report.module.css'

const READ_LIMIT = 300
const WRITE_LIMIT = 1000
const FAIL_LIMIT = 1

type Section = 'overview' | ServiceId | 'clues' | 'conditions'
type TocEntry = { id: Section; label: string; note?: string }

export function formatMs(ms: number) {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}

function GradeChip({ grade, children }: { grade: Grade; children: React.ReactNode }) {
  return <span className={`${s.grade} ${s[grade]}`}>{children}</span>
}

/** 기준을 넘은 값만 굵게 표시한다 */
function Num({ text, over }: { text: string; over: boolean }) {
  return <span className={over ? s.over : undefined}>{text}</span>
}

const TOC: { group: string; items: TocEntry[] }[] = [
  { group: '요약', items: [{ id: 'overview', label: '개요' }] },
  {
    group: '서비스',
    items: LOAD.map((r) => ({ id: r.id, label: r.name, note: formatMs(r.readP95) })),
  },
  {
    group: '참고',
    items: [
      { id: 'clues', label: '개선 단서', note: `${CLUES.length}개` },
      { id: 'conditions', label: '측정 조건' },
    ],
  },
]

/** 운영 서버 부하 테스트 결과. 크루런 리포트 아티팩트와 같은 모양(왼쪽 목차 + 본문)으로 보여 준다. */
export function PerformanceView() {
  const [section, setSection] = useState<Section>('overview')
  const service = LOAD.find((r) => r.id === section)

  return (
    <div className={s.report}>
      <nav aria-label="성능 측정 목차" className={s.toc}>
        {TOC.map((g) => (
          <div key={g.group} className="contents">
            <div className={s.group}>{g.group}</div>
            {g.items.map((i) => (
              <button
                key={i.id}
                type="button"
                className={s.tocItem}
                aria-current={i.id === section}
                onClick={() => setSection(i.id)}
              >
                {i.label}
                {i.note && <small>{i.note}</small>}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div className={s.page}>
        {section === 'overview' && <Overview onSelect={setSection} />}
        {service && <ServicePage result={service} />}
        {section === 'clues' && <Clues />}
        {section === 'conditions' && <Conditions />}
      </div>
    </div>
  )
}

function Overview({ onSelect }: { onSelect: (id: Section) => void }) {
  return (
    <>
      <header>
        <h2 className={s.title}>성능 측정</h2>
        <p className={s.sub}>{MEASURED_AT} 운영 서버 · 회원 · 크루 · 게시판 · 목표 부하 5분</p>
      </header>
      <div className={s.lead}>
        {CONCLUSIONS.map((c) => (
          <p key={c}>{c}</p>
        ))}
      </div>
      <div role="group" aria-label="서비스별 결과" className={s.facts}>
        {LOAD.map((r) => (
          <button key={r.id} type="button" className={s.fact} onClick={() => onSelect(r.id)}>
            <span className={s.factLabel}>{r.name} 조회 p95</span>
            <span className={s.big}>{formatMs(r.readP95)}</span>
            <span>
              <GradeChip grade={r.grade}>{r.verdict}</GradeChip>
            </span>
          </button>
        ))}
      </div>
      <section>
        <h3 className={s.h2}>한눈에 보기</h3>
        <div className={s.tbl}>
          <table aria-label="서비스별 결과 표">
            <thead>
              <tr>
                <th>서비스</th>
                <th>판정</th>
                <th>초당 반복 (목표 → 실제)</th>
                <th>요청</th>
                <th>실패율</th>
                <th>조회 p95</th>
                <th>쓰기 p95</th>
              </tr>
            </thead>
            <tbody>
              {LOAD.map((r) => (
                <tr key={r.id}>
                  <td>
                    <b>{r.name}</b>
                  </td>
                  <td>
                    <GradeChip grade={r.grade}>{r.verdict}</GradeChip>
                  </td>
                  <td className={s.num}>
                    {r.targetRps} → {r.actualRps}
                  </td>
                  <td className={s.num}>{r.requests.toLocaleString()}</td>
                  <td className={s.num}>
                    <Num text={`${r.failRate}%`} over={r.failRate >= FAIL_LIMIT} />
                  </td>
                  <td className={s.num}>
                    <Num text={formatMs(r.readP95)} over={r.readP95 > READ_LIMIT} />
                  </td>
                  <td className={s.num}>
                    <Num text={formatMs(r.writeP95)} over={r.writeP95 > WRITE_LIMIT} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className={s.take}>
        <b>통과 기준</b>
        조회 p95 300ms, 쓰기 p95 1초, 실패율 1% 미만이에요. 기준을 넘은 숫자는 굵게 표시했어요.
      </div>
    </>
  )
}

function ServicePage({ result }: { result: LoadResult }) {
  const hasP99 = result.endpoints.some((e) => e.p99 !== undefined)
  return (
    <>
      <header>
        <h2 className={s.title}>{result.name}</h2>
        <p className={s.sub}>
          <GradeChip grade={result.grade}>{result.verdict}</GradeChip> · 목표 부하 5분
        </p>
      </header>
      <dl className={s.facts}>
        <Fact label="조회 p95" value={formatMs(result.readP95)} />
        <Fact label="쓰기 p95" value={formatMs(result.writeP95)} />
        <Fact label="실패율" value={`${result.failRate}%`} />
        <Fact label="초당 반복 (목표 → 실제)" value={`${result.targetRps} → ${result.actualRps}`} />
      </dl>
      <div className={s.lead}>
        <ul className={s.pts}>
          {result.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </div>
      {result.timeline && (
        <section>
          <h3 className={s.h2}>무너진 순서</h3>
          <ol className={s.steps} aria-label={`${result.name} 시간 순서`}>
            {result.timeline.map(([t, what], i) => (
              <li key={t} className={s.step}>
                <span className={s.n}>{i + 1}</span>
                <h4 className={s.stepTitle}>{t}</h4>
                <p>{what}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
      <section>
        <h3 className={s.h2}>주소별 응답 시간</h3>
        <div className={s.tbl}>
          <table aria-label={`${result.name} 주소별 응답 시간`}>
            <thead>
              <tr>
                <th>주소</th>
                <th>요청</th>
                <th>실패율</th>
                <th>중앙값</th>
                <th>p95</th>
                {hasP99 && <th>p99</th>}
                <th>최대</th>
              </tr>
            </thead>
            <tbody>
              {result.endpoints.map((e) => {
                const limit = e.path.startsWith('GET') ? READ_LIMIT : WRITE_LIMIT
                return (
                  <tr key={e.path}>
                    <td className={s.code}>{e.path}</td>
                    <td className={s.num}>{e.requests.toLocaleString()}</td>
                    <td className={s.num}>
                      <Num text={`${e.failRate}%`} over={e.failRate >= FAIL_LIMIT} />
                    </td>
                    <td className={s.num}>{formatMs(e.p50)}</td>
                    <td className={s.num}>
                      <Num text={formatMs(e.p95)} over={e.p95 > limit} />
                    </td>
                    {hasP99 && (
                      <td className={s.num}>{e.p99 === undefined ? '-' : formatMs(e.p99)}</td>
                    )}
                    <td className={s.num}>{formatMs(e.max)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className={s.fact}>
      <dt>{label}</dt>
      <dd className={s.big}>{value}</dd>
    </div>
  )
}

function Clues() {
  return (
    <>
      <header>
        <h2 className={s.title}>개선 단서</h2>
        <p className={s.sub}>기록에서 나온 단서예요. 원인은 아직 단정하지 않았어요.</p>
      </header>
      <ol className={s.steps} aria-label="개선 단서">
        {CLUES.map((c, i) => {
          const [head, ...rest] = c.split(': ')
          return (
            <li key={c} className={s.step}>
              <span className={s.n}>{i + 1}</span>
              <h4 className={s.stepTitle}>{rest.length ? head : '앱 서버'}</h4>
              <p>{rest.length ? rest.join(': ') : c}</p>
            </li>
          )
        })}
      </ol>
    </>
  )
}

function Conditions() {
  return (
    <>
      <header>
        <h2 className={s.title}>측정 조건</h2>
        <p className={s.sub}>{MEASURED_AT} 운영 서버에서 잰 조건이에요.</p>
      </header>
      <dl className={s.facts}>
        {CONDITIONS.map(([k, v]) => (
          <div key={k} className={s.fact}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <section>
        <h3 className={s.h2}>스크립트 확인 (smoke, 초당 1번 30초)</h3>
        <div className={s.tbl}>
          <table aria-label="스크립트 확인 결과">
            <thead>
              <tr>
                <th>서비스</th>
                <th>판정</th>
                <th>요청</th>
                <th>실패</th>
                <th>조회 p95</th>
                <th>쓰기 p95</th>
                <th>중앙값</th>
              </tr>
            </thead>
            <tbody>
              {SMOKE.map((r) => (
                <tr key={r.name}>
                  <td>
                    <b>{r.name}</b>
                  </td>
                  <td>
                    <GradeChip grade={r.grade}>{r.verdict}</GradeChip>
                  </td>
                  <td className={s.num}>{r.requests}</td>
                  <td className={s.num}>{r.failed}</td>
                  <td className={s.num}>
                    {r.readP95 === undefined ? (
                      '-'
                    ) : (
                      <Num text={formatMs(r.readP95)} over={r.readP95 > READ_LIMIT} />
                    )}
                  </td>
                  <td className={s.num}>{r.writeP95 === undefined ? '-' : formatMs(r.writeP95)}</td>
                  <td className={s.num}>{r.p50 === undefined ? '-' : formatMs(r.p50)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={s.foot}>요청 수가 적어서 성능을 판단하는 값으로 쓰지 않아요.</p>
      </section>
    </>
  )
}
