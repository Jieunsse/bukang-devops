'use client'

import { CircleQuestion } from '@gravity-ui/icons'
import { Button, Popover } from '@heroui/react'
import { buttonVariants } from '@heroui/styles'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

import { ThemeToggle } from '@/features/theme'

import { NAV_ITEMS } from './nav'

/** 페이지를 옮겨도 필터가 남도록 지금 주소의 뒷부분을 그대로 붙인다. */
function useNavLinks() {
  const pathname = usePathname()
  const search = useSearchParams().toString()
  return NAV_ITEMS.map((item) => ({
    ...item,
    href: `${item.href}${search ? `?${search}` : ''}`,
    isCurrent: pathname === item.href,
  }))
}

const linkClass = (isCurrent: boolean) =>
  buttonVariants({ variant: isCurrent ? 'secondary' : 'ghost', fullWidth: true }) + ' justify-start'

export function AppSidebar() {
  const links = useNavLinks()
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r border-separator bg-background-secondary p-3 md:flex">
      {/* NAV_ITEMS 첫 칸이 대시보드라서, 로고도 같은 주소로 보내 필터를 그대로 남긴다. */}
      <Link
        href={links[0]?.href ?? '/'}
        className="flex items-center gap-2 rounded-lg px-3 pt-2 text-lg font-semibold"
      >
        <Image src="/bukangi.png" alt="" width={57} height={36} priority />
        부캉이 데브옵스
      </Link>
      <nav aria-label="페이지" className="flex flex-col gap-1">
        {links.map((l) => (
          <Link
            key={l.label}
            href={l.href}
            aria-current={l.isCurrent ? 'page' : undefined}
            className={linkClass(l.isCurrent)}
          >
            <l.Icon aria-hidden className="size-4" />
            {l.label}
          </Link>
        ))}
      </nav>
      <div role="group" aria-label="메뉴 아래쪽" className="mt-auto flex flex-col gap-1">
        <HelpPopover />
        <ThemeToggle showLabel />
      </div>
    </aside>
  )
}

/** 휴대폰에서는 왼쪽 메뉴 대신 위쪽에 가로로 보여 준다. */
export function MobileNav() {
  const links = useNavLinks()
  return (
    <div className="flex items-center gap-2 md:hidden">
      <nav aria-label="페이지" className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
        {links.map((l) => (
          <Link
            key={l.label}
            href={l.href}
            aria-current={l.isCurrent ? 'page' : undefined}
            className={buttonVariants({ variant: l.isCurrent ? 'secondary' : 'ghost', size: 'sm' })}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      {/* 휴대폰에서는 왼쪽 메뉴가 없어서 화면 전환 버튼을 아이콘으로 위쪽 메뉴 끝에 둔다. */}
      <ThemeToggle />
    </div>
  )
}

function HelpPopover() {
  return (
    <Popover>
      <Button variant="ghost" fullWidth className="justify-start">
        <CircleQuestion aria-hidden className="size-4" />
        도움말
      </Button>
      <Popover.Content placement="top start" className="max-w-xs">
        <Popover.Dialog>
          <Popover.Heading>이 화면은 보기 전용이에요</Popover.Heading>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-4 text-sm text-muted">
            <li>티켓 수정은 Linear에서 해 주세요.</li>
            <li>날짜는 모두 한국 시간 기준이에요.</li>
            <li>서버가 10분마다 Linear에서 새로 받아요.</li>
            <li>새로고침 버튼은 1분에 한 번만 Linear를 불러요.</li>
          </ul>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  )
}
