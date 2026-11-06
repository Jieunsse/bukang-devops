import { AppHeader } from './AppHeader'
import { AppSidebar, MobileNav } from './AppSidebar'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-background">
      <AppSidebar />
      {/* 내용 폭을 고정해, 목록이 비어도 카드 폭이 바뀌지 않게 한다. 달력처럼 data-wide를 단 페이지는 화면 폭을 다 쓴다. */}
      <div className="mx-auto flex w-full max-w-[96rem] min-w-0 flex-1 flex-col gap-6 px-4 py-4 has-[[data-wide]]:max-w-none md:px-6 md:py-6">
        <MobileNav />
        <AppHeader />
        <main>{children}</main>
      </div>
    </div>
  )
}
