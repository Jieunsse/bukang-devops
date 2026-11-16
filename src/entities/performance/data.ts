/**
 * 크루런 운영 서버 부하 테스트 결과.
 * 원본은 크루런 레포 backend/loadtest/results/2026-11-16-member-crew-board.md 이고, 숫자를 손으로 옮겼다.
 * 응답 시간 단위는 ms다.
 */

export type ServiceId = 'board' | 'crew' | 'member' | 'inquiry'

/** 리포트 아티팩트와 같은 등급 칩. good 통과, ok 조금 넘음, weak 크게 넘음, none 무너짐·측정 못 함 */
export type Grade = 'good' | 'ok' | 'weak' | 'none'

export type Endpoint = {
  path: string
  requests: number
  failRate: number
  p50: number
  p95: number
  p99?: number
  max: number
}

export type LoadResult = {
  id: ServiceId
  name: string
  targetRps: string
  actualRps: number
  requests: number
  failRate: number
  readP95: number
  writeP95: number
  verdict: string
  grade: Grade
  endpoints: Endpoint[]
  notes: string[]
  /** 무너진 서비스만 있다. [시각, 일어난 일] */
  timeline?: [string, string][]
}

export type SmokeResult = {
  name: string
  requests: number
  failed: string
  readP95?: number
  writeP95?: number
  p50?: number
  max?: number
  verdict: string
  grade: Grade
}

export const MEASURED_AT = '2026-11-16'

export const CONDITIONS: [string, string][] = [
  ['대상', '운영 서버 crewrun.duckdns.org (k3s, 앱 서버 vCPU 2개·메모리 7.8GB)'],
  ['보낸 곳', '개발자 맥 한 대, k6 v2.4.0'],
  ['테스트 회원', 'loadtest1~200 200명'],
  ['통과 기준', '조회 p95 300ms, 쓰기 p95 1초, 실패율 1% 미만'],
  ['응답 시간', '맥에서 운영 서버까지 오가는 네트워크 시간이 들어 있어요'],
  ['문의', '운영에 배포되지 않아 빠졌어요. main 배포 뒤 다시 측정해요'],
]

/** 페이지 맨 위에 보여 주는 결론. 한 줄에 하나씩 */
export const CONCLUSIONS = [
  '게시판은 초당 68번에서 CPU가 바닥나 47초 만에 무너졌어요. 입구 Traefik까지 다시 시작돼 모든 서비스 연결이 함께 끊겼어요.',
  '회원은 실패 없이 끝났지만 CPU에 여유가 있는데도 중앙값이 200ms예요.',
  '크루는 중앙값 60ms로 빠르고, 느린 쪽 5%만 기준을 조금 넘었어요.',
  'MySQL·Redis는 한가했어요. 병목은 DB가 아니라 앱 서버 쪽이에요.',
]

export const LOAD: LoadResult[] = [
  {
    id: 'board',
    name: '게시판',
    targetRps: '136',
    actualRps: 68,
    requests: 3330,
    failRate: 7.65,
    readP95: 14890,
    writeP95: 15840,
    verdict: '47초 만에 무너져 자동 중단',
    grade: 'none',
    endpoints: [
      {
        path: 'GET /board/posts (최신)',
        requests: 980,
        failRate: 7.35,
        p50: 8913,
        p95: 15014,
        max: 19584,
      },
      {
        path: 'GET /board/posts?sort=POPULAR',
        requests: 249,
        failRate: 9.64,
        p50: 8715,
        p95: 14598,
        max: 18846,
      },
      {
        path: 'GET /board/posts?category',
        requests: 241,
        failRate: 6.64,
        p50: 9183,
        p95: 14952,
        max: 19966,
      },
      {
        path: 'GET /board/posts?q (검색)',
        requests: 123,
        failRate: 6.5,
        p50: 8952,
        p95: 14446,
        max: 22647,
      },
      {
        path: 'GET /board/posts/{postId}',
        requests: 725,
        failRate: 8.0,
        p50: 9473,
        p95: 15191,
        max: 20455,
      },
      {
        path: 'GET /board/posts/{postId}/comments',
        requests: 736,
        failRate: 7.74,
        p50: 9406,
        p95: 14879,
        max: 20506,
      },
      {
        path: 'POST /board/posts',
        requests: 22,
        failRate: 4.55,
        p50: 9280,
        p95: 17044,
        max: 19350,
      },
      {
        path: 'POST /board/posts/{postId}/comments',
        requests: 118,
        failRate: 9.32,
        p50: 10016,
        p95: 16004,
        max: 18509,
      },
      {
        path: 'PUT /board/posts/{postId}/like',
        requests: 80,
        failRate: 5.0,
        p50: 9552,
        p95: 15257,
        max: 19246,
      },
      {
        path: 'DELETE /board/posts/{postId}/like',
        requests: 55,
        failRate: 7.27,
        p50: 9987,
        p95: 16811,
        max: 18904,
      },
    ],
    timeline: [
      ['15:37:06', '시작. 초당 136번을 목표로 보냄'],
      ['15:37:12', '게시판 서비스 CPU가 100%(코어 1개)에 닿음. 끝날 때까지 75~112%'],
      [
        '15:37:12~44',
        '응답이 9초대로 밀려 기다리는 사용자가 1,360명까지 늘어남. 입구 Traefik 메모리 28MB → 208MB, CPU 최대 109%',
      ],
      ['15:37:50', 'Traefik 컨테이너가 종료되고 다시 시작됨. 실패 235건이 이때 몰림'],
      ['15:37:55', '전체 실패율이 5%를 넘어 테스트가 스스로 멈춤'],
    ],
    notes: [
      '모든 주소가 똑같이 중앙값 9초였어요. 쿼리 하나가 아니라 게시판 서비스 전체가 CPU를 다 써서 줄이 밀렸어요.',
      '실패 255건은 연결 거절 199건, 연결 끊김 43건, 응답 도중 끊김 12건, HTTP/2 종료 1건이에요. 거의 모두 Traefik이 다시 시작되던 때 났어요.',
      '같은 시각 게이트웨이 CPU는 최대 43%, Nginx는 최대 10%, MySQL은 최대 22%로 여유가 있었어요.',
      '초당 1번만 보낸 스모크에서도 중앙값이 143ms로 크루(39ms)의 3배가 넘었어요. 요청 하나에 드는 CPU가 커요.',
    ],
  },
  {
    id: 'crew',
    name: '크루',
    targetRps: '42',
    actualRps: 41,
    requests: 12803,
    failRate: 0,
    readP95: 347,
    writeP95: 363,
    verdict: '조회 p95가 기준을 조금 넘음',
    grade: 'ok',
    endpoints: [
      {
        path: 'GET /member/crews/me',
        requests: 6001,
        failRate: 0,
        p50: 58,
        p95: 342,
        p99: 790,
        max: 1630,
      },
      {
        path: 'GET /member/crews/{crewId}',
        requests: 6001,
        failRate: 0,
        p50: 60,
        p95: 349,
        p99: 806,
        max: 1644,
      },
      {
        path: 'POST /member/crews/{crewId}/invites',
        requests: 601,
        failRate: 0,
        p50: 65,
        p95: 363,
        p99: 852,
        max: 1395,
      },
    ],
    notes: [
      '중앙값은 60ms 안팎으로 빠르고, 느린 쪽 5%가 350ms 근처예요.',
      '회원 서비스(크루가 들어 있음) CPU는 평균 22%, 최대 98%였어요. 순간적으로 코어 하나를 다 쓰는 때가 있었어요.',
    ],
  },
  {
    id: 'member',
    name: '회원',
    targetRps: '약 65',
    actualRps: 58,
    requests: 17619,
    failRate: 0,
    readP95: 962,
    writeP95: 930,
    verdict: '조회 p95가 기준을 크게 넘음',
    grade: 'weak',
    endpoints: [
      {
        path: 'GET /member/members/me',
        requests: 8944,
        failRate: 0,
        p50: 201,
        p95: 956,
        p99: 2508,
        max: 7061,
      },
      {
        path: 'GET /member/members/me/marketing-consent',
        requests: 2981,
        failRate: 0,
        p50: 205,
        p95: 978,
        p99: 2664,
        max: 5797,
      },
      {
        path: 'POST /auth/reissue',
        requests: 5694,
        failRate: 0,
        p50: 206,
        p95: 932,
        p99: 2093,
        max: 6472,
      },
    ],
    notes: [
      '중앙값부터 200ms로, 같은 회원 서비스를 쓰는 크루(60ms)보다 3배 넘게 느렸어요.',
      '회원 서비스 CPU는 평균 17%, 최대 70%였어요. CPU가 바닥나지 않았는데도 느렸다는 점이 게시판과 달라요.',
      '응답이 늦어져 반복 77건을 보내지 못했어요.',
      '토큰 재발급 5,694건이 모두 성공했어요. 회전과 재사용 탐지가 부하 아래에서도 오작동하지 않았어요.',
    ],
  },
]

export const SMOKE: SmokeResult[] = [
  {
    name: '게시판',
    requests: 337,
    failed: '0',
    readP95: 274,
    writeP95: 266,
    p50: 143,
    max: 1460,
    verdict: '통과',
    grade: 'good',
  },
  {
    name: '크루',
    requests: 492,
    failed: '0',
    readP95: 244,
    writeP95: 253,
    p50: 39,
    max: 535,
    verdict: '통과',
    grade: 'good',
  },
  {
    name: '회원',
    requests: 89,
    failed: '0',
    readP95: 360,
    writeP95: 410,
    p50: 57,
    max: 650,
    verdict: '조회 p95 기준 초과',
    grade: 'ok',
  },
  {
    name: '문의',
    requests: 439,
    failed: '439 (503)',
    verdict: '배포되지 않아 측정 못 함',
    grade: 'none',
  },
]

export const CLUES = [
  '게시판: 요청 하나에 CPU를 많이 쓰는 곳 찾기. Pod는 메모리 상한 512Mi, CPU 상한 없음, SerialGC예요.',
  '회원: CPU와 DB가 한가한데 중앙값이 200ms인 이유 찾기.',
  '입구: 게시판 하나가 밀리자 Traefik이 다시 시작되면서 모든 서비스의 연결이 함께 끊겼어요. 한 서비스의 과부하가 전체로 번지지 않게 막기.',
  '앱 서버는 vCPU가 2개예요. 게시판(코어 1개)과 Traefik(코어 1개)만으로 CPU가 거의 다 찼어요.',
]
