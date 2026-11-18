import { DETAIL_PANELS, SECTION_HELP, SECTION_NAMES } from './glossary-detail'
import type { Panel } from './parse'

// 그라파나 패널·묶음의 영어 이름을 뜻으로 바꾸고, 「어떻게 보면 되는지」 한 줄을 붙인다.
// 사전에 없는 패널은 원래 영어 이름을 그대로 쓴다. 이름이 없는 패널은 질의의 지표 이름으로 이름을 붙인다.

/** ignoreThresholds: 그라파나 원본 기준값이 이 서버에 맞지 않아 판정에 쓰지 않는다 */
/** spec: 바뀌지 않는 사양 값이라 카드 대신 맨 위 한 줄에 「spec 값」으로 모은다 */
type Entry = { name: string; help?: string; ignoreThresholds?: boolean; spec?: string }

const PANELS: Record<string, Entry> = {
  // 서버(Node Exporter)
  Pressure: {
    name: '자원 대기',
    help: 'CPU·메모리·디스크를 기다리느라 멈춘 시간 비율이에요. 0%에 가까울수록 좋아요.',
  },
  'CPU Busy': {
    name: 'CPU 사용률',
    help: 'CPU가 일한 시간 비율이에요. 85%를 넘으면 요청이 느려지기 시작해요.',
  },
  'Sys Load': {
    name: '시스템 부하',
    help: '1분 평균 부하를 코어 수로 나눈 값이에요. 100%면 모든 코어가 쉬지 않고 일해요.',
  },
  'RAM Used': {
    name: '메모리 사용률',
    help: '90%를 넘으면 스왑을 쓰거나 프로그램이 강제로 꺼질 수 있어요.',
  },
  'SWAP Used': {
    name: '스왑 사용률',
    help: '메모리가 모자라 디스크를 메모리처럼 쓴 비율이에요. 높을수록 서버가 느려져요.',
  },
  'Root FS Used': {
    name: '디스크 사용률',
    help: '90%를 넘으면 로그와 DB 쓰기가 실패할 수 있어요.',
  },
  'CPU Basic': {
    name: 'CPU 사용 내역',
    help: '프로그램·시스템·입출력 대기 등 CPU 시간이 어디에 쓰였는지 나눠 보여 줘요.',
  },
  'Memory Basic': {
    name: '메모리 사용 내역',
    help: '전체 메모리 중 사용·캐시·여유를 나눠 보여 줘요. 여유가 0에 붙으면 위험해요.',
  },
  'Network Traffic Basic': {
    name: '네트워크 주고받은 양',
    help: '네트워크 장치별로 초당 받은 양(Rx)과 보낸 양(Tx)이에요.',
  },
  'Disk Space Used Basic': {
    name: '디스크 사용률(위치별)',
    help: '디스크 위치(마운트)별 사용률이에요. 90%를 넘는 곳은 정리가 필요해요.',
  },
  'I/O Utilization': {
    name: '디스크 바쁜 정도',
    help: '디스크가 일한 시간 비율이에요. 100%에 가까우면 디스크가 병목이에요.',
  },
  'Disk IOps': { name: '디스크 초당 읽기·쓰기 횟수' },
  'I/O Usage Read / Write': { name: '디스크 초당 읽기·쓰기 양' },
  // JVM
  Uptime: { name: '켜진 지 지난 시간', help: '갑자기 짧아졌다면 그 사이에 재시작된 거예요.' },
  'Start time': { name: '시작 시각' },
  'Heap used': {
    name: '힙 사용률',
    help: '자바 객체가 쓰는 메모리 비율이에요. 90%를 넘으면 GC가 잦아지고 응답이 느려져요.',
  },
  'Non-Heap used': {
    name: '힙 밖 메모리 사용률',
    help: '클래스 정보처럼 힙 밖에 두는 메모리 비율이에요.',
  },
  Rate: { name: '초당 요청 수' },
  Errors: {
    name: '초당 오류 응답 수',
    help: '오류로 끝난 요청이 초당 몇 건인지예요. 0에 가까울수록 좋아요.',
  },
  Duration: { name: '평균·최대 응답 시간', help: '서버 오류(5xx)로 끝난 요청은 빼고 계산해요.' },
  Utilisation: {
    name: '요청 처리 중인 스레드 수',
    help: '최대 스레드 수에 닿으면 새 요청이 줄을 서서 기다려요.',
  },
  'JVM Heap': {
    name: '힙 메모리 추이',
    help: '사용 중(used)이 최대(max)에 붙어 있으면 메모리가 모자란 거예요.',
  },
  'JVM Non-Heap': { name: '힙 밖 메모리 추이' },
  'JVM Total': { name: 'JVM 전체 메모리' },
  'JVM Process Memory': { name: '프로세스 메모리' },
  'CPU Usage': {
    name: 'CPU 사용률',
    help: 'system은 서버 전체, process는 이 서비스만의 CPU 사용률이에요.',
  },
  Load: { name: '시스템 부하' },
  Threads: { name: '스레드 수' },
  'Thread States': {
    name: '상태별 스레드 수',
    help: 'blocked가 늘면 락을 기다리는 스레드가 많은 거예요.',
  },
  'Log Events': { name: '로그 레벨별 건수', help: 'error·warn이 늘면 그 시각의 로그를 확인해요.' },
  'File Descriptors': {
    name: '열린 파일 수',
    help: '최대에 닿으면 새 연결이나 파일을 열지 못해요.',
  },
  Collections: { name: 'GC 횟수' },
  'Pause Durations': {
    name: 'GC 멈춤 시간',
    help: '이 시간 동안 요청 처리가 멈춰요. 길수록 응답이 느려져요.',
  },
  'Allocated/Promoted': { name: '메모리 할당·승격 양' },
  // MySQL
  // 원본 기준값이 「35 미만이면 빨강」이라 한가한 서버는 늘 위험으로 보인다
  'Current QPS': { name: '초당 질의 수', ignoreThresholds: true },
  // 원본 기준값(90·95)이 바이트 단위와 맞지 않아 늘 위험으로 보인다
  'InnoDB Buffer Pool': {
    name: '버퍼 풀 크기',
    help: '자주 쓰는 데이터를 메모리에 올려 두는 공간의 크기예요.',
    ignoreThresholds: true,
  },
  'MySQL Connections': {
    name: '연결 수',
    help: '최대 연결 수(Max Connections)에 가까워지면 새 연결이 거부돼요.',
  },
  'MySQL Client Thread Activity': {
    name: '연결·실행 중 스레드',
    help: 'Threads Running이 계속 높으면 쿼리가 밀리고 있는 거예요.',
  },
  'MySQL Questions': { name: '초당 질의 수(클라이언트)' },
  'MySQL Temporary Objects': {
    name: '임시 테이블',
    help: '디스크 임시 테이블(Disk Tables)이 늘면 쿼리가 느려져요.',
  },
  'MySQL Select Types': {
    name: 'SELECT 종류',
    help: 'Full Join·Scan이 늘면 인덱스를 타지 않는 쿼리가 있는 거예요.',
  },
  'MySQL Sorts': { name: '정렬' },
  'MySQL Slow Queries': {
    name: '느린 쿼리 수',
    help: '0이어야 좋아요. 늘면 느린 쿼리 로그를 확인해요.',
  },
  'MySQL Aborted Connections': { name: '비정상 종료된 연결' },
  'MySQL Table Locks': {
    name: '테이블 락',
    help: 'Waited가 늘면 락을 기다리는 쿼리가 있는 거예요.',
  },
  'MySQL Network Traffic': { name: '네트워크 주고받은 양' },
  // Elasticsearch
  'Cluster health': { name: '클러스터 상태' },
  'Tripped for breakers': {
    name: '메모리 차단기 작동',
    help: '메모리 보호 장치(차단기)가 요청을 막은 적이 있는지예요. 0이어야 좋아요.',
  },
  'CPU usage Avg.': { name: 'CPU 사용률 평균' },
  'JVM memory used Avg.': { name: 'JVM 메모리 사용 평균' },
  Nodes: { name: '노드 수' },
  'Data nodes': { name: '데이터 노드 수' },
  'Pending tasks': {
    name: '대기 중인 작업',
    help: '늘어나면 클러스터가 작업을 제때 처리하지 못하고 있는 거예요.',
  },
  'Unassigned shards': {
    name: '배정 못 받은 샤드',
    help: '0이어야 해요. 남아 있으면 일부 데이터를 검색하지 못할 수 있어요.',
  },
  'Active shards': { name: '활성 샤드' },
  'Active primary shards': { name: '활성 주 샤드' },
  // k6
  'Performance Overview': {
    name: '부하 테스트 흐름',
    help: '가상 사용자 수와 요청 수, 응답 시간을 함께 보여 줘요.',
  },
  'HTTP requests': { name: '전체 요청 수' },
  'HTTP request failures': { name: '실패한 요청 수', help: '0이어야 좋아요.' },
  'Peak RPS': { name: '최대 초당 요청' },
  'HTTP Request Duration': { name: '응답 시간' },
}

/** 이름이 없는 패널은 질의에 나오는 지표로 뜻을 정한다 */
const BY_METRIC: [RegExp, Entry][] = [
  [/count\(.*node_cpu_seconds_total/, { name: 'CPU 코어 수', spec: '코어' }],
  [/node_memory_MemTotal_bytes/, { name: '전체 메모리', spec: '메모리' }],
  [/node_memory_SwapTotal_bytes/, { name: '전체 스왑', spec: '스왑' }],
  [/node_filesystem_size_bytes/, { name: '디스크 크기', spec: '디스크' }],
  [/node_boot_time_seconds/, { name: '켜진 지 지난 시간', spec: '켜진 지' }],
]

const SECTIONS: Record<string, string> = {
  'Quick CPU / Mem / Disk': '한눈에 보기',
  'Basic CPU / Mem / Net / Disk': '기본 지표',
  'CPU / Memory / Net / Disk': '자세한 지표',
  'Memory Details': '메모리 자세히',
  Processes: '프로세스',
  'CPU & Scheduler': 'CPU 스케줄러',
  'Hardware & Time': '하드웨어·시간',
  Systemd: 'systemd 서비스',
  Storage: '저장 장치',
  'Network Traffic': '네트워크 트래픽',
  'Network Sockstat': '소켓',
  'Network Netstat': '네트워크 통계',
  'Node Exporter': '수집기 상태',
  'Quick Facts': '한눈에 보기',
  'I/O Overview': '요청 처리',
  'JVM Memory': 'JVM 메모리',
  'JVM Misc': 'JVM 기타',
  'JVM Memory Pools (Heap)': '힙 메모리 영역',
  'JVM Memory Pools (Non-Heap)': '힙 밖 메모리 영역',
  'Garbage Collection': 'GC',
  Classloading: '클래스 로딩',
  'Buffer Pools': '버퍼 풀',
  KPI: '한눈에 보기',
  Shards: '샤드',
  Connections: '연결',
  'Table Locks': '테이블 락',
  'Temporary Objects': '임시 객체',
  Sorts: '정렬',
  Aborted: '끊긴 연결',
  Network: '네트워크',
  Memory: '메모리',
  'Performance Overview': '한눈에 보기',
  Checks: '검사',
}

export type PanelLabel = {
  name: string
  original: string | null
  help: string | null
  ignoreThresholds: boolean
  /** 사양 한 줄에 쓸 짧은 이름. 사양 값이 아니면 null */
  spec: string | null
}

/** 화면에 쓸 패널 이름. original은 뜻으로 바꿨을 때만 원래 영어 이름 */
export function panelLabel(panel: Pick<Panel, 'title' | 'targets'>): PanelLabel {
  const known = PANELS[panel.title]
  if (known) {
    return {
      name: known.name,
      original: panel.title,
      help: known.help ?? null,
      ignoreThresholds: Boolean(known.ignoreThresholds),
      spec: null,
    }
  }
  const detail = DETAIL_PANELS[panel.title]
  if (detail) {
    return {
      name: detail.name,
      original: panel.title,
      help: detail.help,
      ignoreThresholds: false,
      spec: null,
    }
  }
  if (panel.title) {
    return { name: panel.title, original: null, help: null, ignoreThresholds: false, spec: null }
  }
  const exprs = panel.targets.map((t) => t.expr).join(' ')
  const byMetric = BY_METRIC.find(([re]) => re.test(exprs))?.[1]
  return {
    name: byMetric?.name ?? '이름 없는 지표',
    original: null,
    help: byMetric?.help ?? null,
    ignoreThresholds: false,
    spec: byMetric?.spec ?? null,
  }
}

export function sectionLabel(title: string): { name: string; original: string | null } {
  const name = SECTIONS[title] ?? SECTION_NAMES[title]
  return name ? { name, original: title } : { name: title, original: null }
}

export function sectionHelp(title: string): string | null {
  return SECTION_HELP[title] ?? null
}
