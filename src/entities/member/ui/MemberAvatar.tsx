import { Avatar } from '@heroui/react'

/** 프로필 이미지가 없거나 불러오지 못하면 이름 첫 글자를 보여 준다. */
export function MemberAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  return (
    <Avatar size="sm" className="size-6 shrink-0 text-xs">
      {avatarUrl && <Avatar.Image src={avatarUrl} alt="" />}
      <Avatar.Fallback>{name.slice(0, 1)}</Avatar.Fallback>
    </Avatar>
  )
}
