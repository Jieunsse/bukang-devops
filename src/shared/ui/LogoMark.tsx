/** HeroUI 기본 강조색. 밝은·어두운 화면에서 같은 값이고, 파비콘·OG 이미지에서도 쓰려고 색 값을 직접 적는다. */
export const ACCENT = '#0485f7'

/** 일정 막대 세 줄을 담은 파란 네모. 사이드바 로고, 파비콘, 링크 미리보기 이미지가 같은 기호를 쓴다. */
export function LogoMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      aria-hidden
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="7" fill={ACCENT} />
      <rect x="7" y="8" width="12" height="4" rx="2" fill="#fff" />
      <rect x="11" y="14" width="14" height="4" rx="2" fill="#fff" />
      <rect x="7" y="20" width="9" height="4" rx="2" fill="#fff" fillOpacity="0.6" />
    </svg>
  )
}
