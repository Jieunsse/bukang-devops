import { EVENTS, SERVICES, type ServiceId } from '@/entities/architecture'

const LABEL = Object.fromEntries(SERVICES.map((s) => [s.id, s.label])) as Record<ServiceId, string>

/** 이벤트 하나를 한 줄로 그린다: 보내는 서비스 → 이벤트 → 받는 서비스. 화살표가 같은 줄 안에서만 이어져 엇갈리지 않는다. */
export function EventFlow({
  selected,
  onSelect,
}: {
  selected: ServiceId | null
  onSelect: (id: ServiceId) => void
}) {
  return (
    <div className="overflow-x-auto">
      <ol
        aria-label="이벤트 흐름"
        className="grid min-w-[52rem] grid-cols-[minmax(0,1fr)_3rem_minmax(0,24rem)_3rem_minmax(0,1fr)] items-center gap-y-2"
      >
        <li aria-hidden className="contents text-xs font-medium text-muted">
          <span className="text-right">보내는 서비스</span>
          <span />
          <span className="text-center">이벤트</span>
          <span />
          <span>받는 서비스</span>
        </li>
        {EVENTS.map((e) => {
          const faded = selected && !e.from.includes(selected) && !e.to.includes(selected)
          const cls = faded ? 'opacity-25' : ''
          return (
            <li key={e.topic} className="contents">
              <div className={`flex flex-wrap justify-end gap-1.5 ${cls}`}>
                {e.from.map((id) => (
                  <ServiceChip key={id} id={id} selected={selected} onSelect={onSelect} />
                ))}
              </div>
              <Arrow className={cls} />
              <div
                className={`rounded-lg border border-border bg-surface px-3 py-1.5 text-center ${cls}`}
              >
                <p className="text-sm font-medium">{e.meaning}</p>
                <p className="font-mono text-[11px] text-muted">{e.topic}</p>
              </div>
              <Arrow className={cls} dashed={e.to.length === 0} />
              <div className={`flex flex-wrap gap-1.5 ${cls}`}>
                {e.to.length > 0 ? (
                  e.to.map((id) => (
                    <ServiceChip key={id} id={id} selected={selected} onSelect={onSelect} />
                  ))
                ) : (
                  <span className="text-xs text-muted">받는 곳 아직 없음</span>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function ServiceChip({
  id,
  selected,
  onSelect,
}: {
  id: ServiceId
  selected: ServiceId | null
  onSelect: (id: ServiceId) => void
}) {
  const on = id === selected
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => onSelect(id)}
      className={
        'rounded-lg border px-2.5 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-focus ' +
        (on
          ? 'border-accent bg-accent text-accent-foreground'
          : 'border-border bg-surface hover:bg-default')
      }
    >
      {LABEL[id]}
    </button>
  )
}

function Arrow({ className, dashed }: { className?: string; dashed?: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 48 10" className={`w-full text-muted ${className ?? ''}`}>
      <path
        d={dashed ? 'M4 5 H44' : 'M4 5 H38'}
        stroke="currentColor"
        strokeWidth={1.25}
        strokeDasharray={dashed ? '3 3' : undefined}
      />
      {!dashed && <path d="M38 1 L46 5 L38 9 z" fill="currentColor" />}
    </svg>
  )
}
