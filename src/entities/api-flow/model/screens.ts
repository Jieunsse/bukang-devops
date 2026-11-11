/**
 * 크루런 프론트 화면 주소를 묶음과 이름으로 나눈다. 요청 목록은 `data/api-flow.json`(추출 스크립트 결과)에 있다.
 * 프론트에 화면이 생기거나 없어지면 테스트가 실패하니, 여기에 이름을 더하거나 지운다.
 */
export type ScreenGroup = {
  id: string
  title: string
  description: string
  screens: { route: string; name: string }[]
}

export const SCREEN_GROUPS: ScreenGroup[] = [
  {
    id: 'auth',
    title: '로그인 · 가입',
    description:
      '이메일 · 소셜 로그인과 가입, 비밀번호 재설정 화면이에요. 모두 회원 서비스로 가요.',
    screens: [
      { route: '/login', name: '로그인' },
      { route: '/signup', name: '가입 1단계 (약관 · 본인인증)' },
      { route: '/signup/account', name: '가입 2단계 (계정)' },
      { route: '/signup/profile', name: '가입 3단계 (프로필)' },
      { route: '/signup/social', name: '소셜 가입' },
      { route: '/auth/social/complete', name: '소셜 로그인 완료' },
      { route: '/password-reset', name: '비밀번호 재설정 요청' },
      { route: '/password-reset/new', name: '새 비밀번호' },
      { route: '/find-email', name: '이메일 찾기' },
      { route: '/find-email/result', name: '이메일 찾기 결과' },
      { route: '/terms/{slug}', name: '약관 보기' },
    ],
  },
  {
    id: 'booking',
    title: '대회 찾기 · 예매',
    description: '홈에서 대회를 고르고 대기열 → 참가 신청 → 장바구니 → 결제까지 가는 순서예요.',
    screens: [
      { route: '/', name: '홈' },
      { route: '/races', name: '대회 목록 · 검색' },
      { route: '/races/{raceId}', name: '대회 상세' },
      { route: '/races/{raceId}/queue', name: '대기열' },
      { route: '/races/{raceId}/apply', name: '참가 신청' },
      { route: '/cart', name: '장바구니' },
      { route: '/checkout', name: '결제' },
      { route: '/checkout/complete', name: '결제 완료' },
    ],
  },
  {
    id: 'tickets',
    title: '내 참가권',
    description: '산 참가권을 보고, 참가자 정보를 고치거나 취소하는 화면이에요.',
    screens: [
      { route: '/tickets', name: '내 참가권 목록' },
      { route: '/tickets/{ticketId}', name: '참가권 상세' },
      { route: '/tickets/{ticketId}/notice', name: '참가 안내' },
      { route: '/tickets/{ticketId}/edit', name: '참가자 정보 수정' },
      { route: '/tickets/{ticketId}/canceled', name: '취소 완료' },
    ],
  },
  {
    id: 'me',
    title: '마이 · 예치금 · 알림',
    description: '내 정보, 예치금 충전 · 환급, 회원 탈퇴, 알림 화면이에요.',
    screens: [
      { route: '/me', name: '마이' },
      { route: '/me/edit', name: '내 정보 수정' },
      { route: '/me/settings', name: '설정' },
      { route: '/me/accounts', name: '연결된 소셜 계정' },
      { route: '/me/deposit', name: '예치금' },
      { route: '/me/deposit/charge', name: '예치금 충전 (포트원 결제창)' },
      { route: '/me/deposit/charge/return', name: '충전 결과 (결제창에서 돌아옴)' },
      { route: '/me/deposit/refund', name: '예치금 환급' },
      { route: '/me/deposit/refund/done', name: '환급 신청 완료' },
      { route: '/me/withdraw', name: '회원 탈퇴' },
      { route: '/me/withdraw/done', name: '탈퇴 완료' },
      { route: '/notifications', name: '알림 목록' },
      { route: '/notifications/{category}', name: '종류별 알림' },
    ],
  },
  {
    id: 'crew',
    title: '크루',
    description: '크루를 만들고 초대 · 가입 · 관리하는 화면이에요. 모두 회원 서비스로 가요.',
    screens: [
      { route: '/crews', name: '내 크루' },
      { route: '/crews/new', name: '크루 만들기' },
      { route: '/crews/{crewId}', name: '크루 상세' },
      { route: '/crews/{crewId}/manage', name: '크루 관리 (크루장)' },
      { route: '/crews/{crewId}/invites', name: '크루원 초대' },
      { route: '/invite/{inviteToken}', name: '초대 받기' },
    ],
  },
  {
    id: 'seller',
    title: '판매자',
    description: '판매자 신청부터 대회 등록, 키트 배송, 정산까지 판매자 콘솔 화면이에요.',
    screens: [
      { route: '/seller-apply', name: '판매자 신청' },
      { route: '/seller-apply/result', name: '신청 결과' },
      { route: '/seller-apply/mine', name: '내 신청 내용' },
      { route: '/seller', name: '판매자 홈' },
      { route: '/seller/races', name: '내 대회' },
      { route: '/seller/races/new', name: '대회 등록' },
      { route: '/seller/races/{raceId}/change', name: '대회 변경 · 취소' },
      { route: '/seller/sales', name: '판매 현황' },
      { route: '/seller/kits', name: '키트 배송' },
      { route: '/seller/settlements', name: '정산' },
      { route: '/seller/settings', name: '판매자 설정' },
    ],
  },
  {
    id: 'admin',
    title: '관리자',
    description:
      '관리자 콘솔 화면이에요. 요청이 없는 화면은 아직 백엔드와 연결하지 않은 화면이에요.',
    screens: [
      { route: '/admin', name: '대시보드' },
      { route: '/admin/sellers', name: '판매자 심사' },
      { route: '/admin/claims', name: '회수 관리' },
      { route: '/admin/holds', name: '지급보류 관리 (목록은 화면 안 예시 데이터)' },
      { route: '/admin/stats', name: '이용 통계' },
      { route: '/admin/stats/data', name: '이용 통계 데이터 (Next 서버 경로)' },
      { route: '/admin/members', name: '회원' },
      { route: '/admin/races', name: '대회' },
      { route: '/admin/settlements', name: '정산' },
      { route: '/admin/settings', name: '설정' },
    ],
  },
  {
    id: 'etc',
    title: '그 밖의 화면',
    description: '권한이 없을 때 보여 주는 화면이에요.',
    screens: [{ route: '/forbidden', name: '접근 권한 없음' }],
  },
]

/** 요청 옆에 붙이는 짧은 설명 */
export const CALL_NOTES: Record<string, string> = {
  'POST /api/v1/auth/identity-verifications/pass': '가짜 응답 모드 전용',
  'GET /admin/stats/data?section={구역}': 'Next 서버 경로, GA4로 집계',
  'GET /api/v1/member/admin/sellers?status=PENDING': '관리자인지 확인할 때',
  '이동 /api/v1/auth/oauth2/authorize/{provider}': '브라우저가 페이지를 옮겨요',
}

/** 요청이 없는 화면에 붙이는 설명 */
export const EMPTY_NOTES: Record<string, string> = {
  '/auth/social/complete': '앱을 켤 때의 토큰 재발급으로 로그인을 마쳐요',
}
