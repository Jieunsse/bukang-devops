import { Person } from '@gravity-ui/icons'
import { Avatar } from '@heroui/react'

/**
 * 프로필 이미지가 없거나 불러오지 못하면 이름 첫 글자를 보여 준다. 담당자가 없으면(name이 null) 회색 사람 아이콘이다.
 * 바탕이 흰 사진도 흰 카드 위에서 경계가 보이게, 모든 사진에 HeroUI 테두리 색으로 1px 선을 두른다.
 */
export function MemberAvatar({
  name,
  avatarUrl,
  small,
}: {
  name: string | null
  avatarUrl?: string | null
  /** 달력 칸처럼 줄 높이가 낮은 곳에서 쓰는 작은 크기 */
  small?: boolean
}) {
  return (
    <Avatar
      size="sm"
      className={`shrink-0 ring-1 ring-border ${small ? 'size-4 text-[9px]' : 'size-6 text-xs'}`}
    >
      {avatarUrl && <Avatar.Image src={avatarUrl} alt="" />}
      <Avatar.Fallback>
        {name ? name.slice(0, 1) : <Person aria-hidden className="size-3/4 text-muted" />}
      </Avatar.Fallback>
    </Avatar>
  )
}
