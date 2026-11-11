// 크루런 백엔드 dev 브랜치(da8b5aa4, 11/11)를 읽고 손으로 옮긴 구조다.
// 출처: backend/compose*.yml, gateway application.yaml 경로, 서비스별 build.gradle.kts·application*.yaml,
// common KafkaTopics 상수와 각 서비스의 @KafkaListener·아웃박스 append 호출.
// shortcut: 코드가 바뀌어도 자동으로 따라가지 않는다. 서비스·토픽이 늘면 이 파일과 BASED_ON을 함께 고친다.

export const BASED_ON = { branch: 'dev', commit: 'da8b5aa4', date: '2026-11-11' }

export type ServiceId =
  | 'member'
  | 'product'
  | 'queue'
  | 'order'
  | 'cash'
  | 'payout'
  | 'file'
  | 'notification'
  | 'board'
  | 'inquiry'

export type Store = 'MySQL' | 'Redis' | 'Elasticsearch' | 'S3'

export type Service = {
  id: ServiceId
  label: string
  port: number
  /** 게이트웨이가 이 서비스로 넘기는 주소 */
  paths: string[]
  stores: Store[]
  /** 이 서비스가 HTTP로 직접 부르는 다른 서비스 */
  calls: ServiceId[]
  /** 크루런 밖의 시스템 */
  external: string[]
  /** 운영 compose에 아직 없으면 적는다 */
  note?: string
}

export const SERVICES: Service[] = [
  {
    id: 'member',
    label: '회원',
    port: 8080,
    paths: ['/api/v1/member/**', '/api/v1/auth/**'],
    stores: ['MySQL', 'Redis'],
    calls: ['cash', 'order'],
    external: ['카카오·구글 로그인', '포트원 본인인증', '카카오톡 메시지', '메일(SMTP)'],
  },
  {
    id: 'product',
    label: '상품',
    port: 8085,
    paths: ['/api/v1/product/**'],
    stores: ['MySQL', 'Elasticsearch'],
    calls: [],
    external: ['Slack(처리 실패 메시지 알림)'],
  },
  {
    id: 'queue',
    label: '대기열',
    port: 8086,
    paths: ['/api/v1/queue/**'],
    stores: ['MySQL', 'Redis'],
    calls: [],
    external: ['Slack(처리 실패 메시지 알림)'],
  },
  {
    id: 'order',
    label: '주문',
    port: 8084,
    paths: ['/api/v1/order/**'],
    stores: ['MySQL'],
    calls: ['product', 'payout', 'cash', 'queue', 'member'],
    external: ['택배 추적(tracker.delivery)'],
  },
  {
    id: 'cash',
    label: '예치금',
    port: 8081,
    paths: ['/api/v1/cash/**'],
    stores: ['MySQL', 'Redis'],
    calls: [],
    external: ['토스페이먼츠'],
  },
  {
    id: 'payout',
    label: '정산',
    port: 8082,
    paths: ['/api/v1/payout/**'],
    stores: ['MySQL'],
    calls: ['cash', 'member', 'order', 'product'],
    external: [],
  },
  {
    id: 'file',
    label: '파일',
    port: 8083,
    paths: ['/api/v1/file/**'],
    stores: ['MySQL', 'S3'],
    calls: [],
    external: ['Slack(처리 실패 메시지 알림)'],
  },
  {
    id: 'notification',
    label: '알림',
    port: 8087,
    paths: ['/api/v1/notification/**'],
    stores: ['MySQL'],
    calls: [],
    external: [],
  },
  {
    id: 'board',
    label: '게시판',
    port: 8089,
    paths: ['/api/v1/board/**'],
    stores: ['MySQL', 'Redis'],
    calls: [],
    external: [],
  },
  {
    id: 'inquiry',
    label: '문의',
    port: 8088,
    paths: ['/api/v1/inquiry/**'],
    stores: ['MySQL'],
    calls: ['member'],
    external: [],
    note: '운영 서버에는 아직 없어요',
  },
]

export type KafkaEvent = {
  topic: string
  /** 무슨 일이 생겼다는 알림인지 */
  meaning: string
  from: ServiceId[]
  to: ServiceId[]
}

export const EVENTS: KafkaEvent[] = [
  {
    topic: 'queuing.member.joined',
    meaning: '회원 가입',
    from: ['member'],
    to: ['cash', 'product', 'board'],
  },
  {
    topic: 'queuing.member.modified',
    meaning: '회원 정보 바뀜',
    from: ['member'],
    to: ['cash', 'product', 'board'],
  },
  { topic: 'queuing.member.withdrawn', meaning: '회원 탈퇴', from: ['member'], to: ['board'] },
  {
    topic: 'queuing.seller.changed',
    meaning: '판매자 정보 바뀜',
    from: ['member'],
    to: ['cash', 'product', 'board'],
  },
  {
    topic: 'queuing.member.consentchanged',
    meaning: '마케팅 수신 동의 바뀜',
    from: ['member'],
    to: [],
  },
  { topic: 'queuing.crew.memberjoined', meaning: '크루원 들어옴', from: ['member'], to: [] },
  { topic: 'queuing.crew.memberleft', meaning: '크루원 나감', from: ['member'], to: ['order'] },
  { topic: 'queuing.crew.leaderchanged', meaning: '크루장 바뀜', from: ['member'], to: [] },
  { topic: 'queuing.race.changed', meaning: '대회 정보 바뀜', from: ['product'], to: ['queue'] },
  {
    topic: 'queuing.racecourse.changed',
    meaning: '코스 정보 바뀜',
    from: ['product'],
    to: ['queue'],
  },
  {
    topic: 'race.filelink.requested',
    meaning: '저장한 대회·글에 이미지 연결',
    from: ['product', 'board'],
    to: ['file'],
  },
  { topic: 'order.race.cancel', meaning: '대회 취소', from: ['product'], to: ['order', 'payout'] },
  {
    topic: 'product.hold.cancel',
    meaning: '대기열 시간이 끝나 임시로 잡은 자리 풀기',
    from: ['order'],
    to: ['product'],
  },
  {
    topic: 'product.hold.restore',
    meaning: '참가권 취소·만료로 자리를 정원에 되돌리기',
    from: ['order'],
    to: ['product'],
  },
  {
    topic: 'queuing.orderitem.refunded',
    meaning: '참가권 환불 → 판매자에게서 돌려받을 돈 기록',
    from: ['order'],
    to: ['payout'],
  },
  {
    topic: 'queuing.order.racerefund',
    meaning: '대회 취소 환불의 보류·완료',
    from: ['order'],
    to: [],
  },
  {
    topic: 'queuing.claim.deposited',
    meaning: '판매자가 청구 계좌에 입금함',
    from: ['cash'],
    to: ['payout'],
  },
  {
    topic: 'push.notification.requested',
    meaning: '회원 한 명에게 알림 띄우기',
    from: ['member', 'order', 'inquiry'],
    to: ['notification'],
  },
]
