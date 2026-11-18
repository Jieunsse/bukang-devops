// 그라파나 단위 이름으로 숫자를 읽기 좋게 바꾼다. 자주 쓰는 단위만 다루고 나머지는 숫자로 보여 준다.

const trim = (n: number, digits: number) => {
  const s = n.toFixed(digits)
  return digits > 0 ? s.replace(/\.?0+$/, '') : s
}

function scaled(v: number, base: number, units: string[], decimals: number | null): string {
  let i = 0
  let n = Math.abs(v)
  while (n >= base && i < units.length - 1) {
    n /= base
    i++
  }
  const digits = decimals ?? (n >= 100 ? 0 : n >= 10 ? 1 : 2)
  return `${v < 0 ? '-' : ''}${trim(n, digits)}${units[i]}`
}

function duration(sec: number, decimals: number | null): string {
  const a = Math.abs(sec)
  const d = (n: number) => trim(n, decimals ?? (n >= 100 ? 0 : n >= 10 ? 1 : 2))
  if (a === 0) return '0s'
  if (a < 1e-3) return `${d(sec * 1e6)}µs`
  if (a < 1) return `${d(sec * 1e3)}ms`
  if (a < 60) return `${d(sec)}s`
  if (a < 3600) return `${d(sec / 60)}분`
  if (a < 86400) return `${d(sec / 3600)}시간`
  return `${d(sec / 86400)}일`
}

const SI = ['', 'K', 'M', 'G', 'T', 'P']
const IEC = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']
const DEC_BYTES = ['B', 'kB', 'MB', 'GB', 'TB', 'PB']

/** 숫자 + 단위 꼬리 */
const suffix: Record<string, string> = {
  ops: ' ops/s',
  reqps: ' req/s',
  iops: ' io/s',
  eps: ' 건/s',
  pps: ' 패킷/s',
  opm: ' ops/분',
  hertz: 'Hz',
  celsius: '°C',
  rotrpm: ' rpm',
}

export function formatUnit(v: number, unit: string | null, decimals: number | null = null): string {
  if (!Number.isFinite(v)) return '-'
  switch (unit) {
    case 'percent':
    case '%':
      return `${trim(v, decimals ?? 1)}%`
    case 'percentunit':
      return `${trim(v * 100, decimals ?? 1)}%`
    case 'bytes':
      return scaled(v, 1024, IEC, decimals)
    case 'decbytes':
      return scaled(v, 1000, DEC_BYTES, decimals)
    case 'bits':
    case 'decbits':
      return scaled(v, 1000, ['b', 'kb', 'Mb', 'Gb', 'Tb'], decimals)
    case 'Bps':
    case 'binBps':
      return `${scaled(v, 1024, IEC, decimals)}/s`
    case 'bps':
      return scaled(v, 1000, ['b/s', 'kb/s', 'Mb/s', 'Gb/s', 'Tb/s'], decimals)
    case 's':
      return duration(v, decimals)
    case 'ms':
      return duration(v / 1000, decimals)
    case 'bool':
      return v ? '참' : '거짓'
    case 'bool_yes_no':
      return v ? '예' : '아니오'
    case 'dateTimeAsIso':
      return new Date(v).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
    default: {
      const tail = unit ? suffix[unit] : undefined
      return `${scaled(v, 1000, SI, decimals)}${tail ?? ''}`
    }
  }
}
