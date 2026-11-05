import { Avatar } from '@heroui/react'

/**
 * 프로필 이미지가 없거나 불러오지 못하면 이름 첫 글자를 보여 준다.
 * 바탕이 흰 사진도 흰 카드 위에서 경계가 보이게, 모든 사진에 HeroUI 테두리 색으로 1px 선을 두른다.
 */
export function MemberAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  return (
    <Avatar size="sm" className="size-6 shrink-0 text-xs ring-1 ring-border">
      {avatarUrl && <Avatar.Image src={avatarUrl} alt="" />}
      <Avatar.Fallback>{name.slice(0, 1)}</Avatar.Fallback>
    </Avatar>
  )
}
