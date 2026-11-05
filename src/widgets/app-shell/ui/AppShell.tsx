import { AppHeader } from './AppHeader'
import { AppSidebar, MobileNav } from './AppSidebar'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-background">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 md:p-6">
        <MobileNav />
        <AppHeader />
        <main>{children}</main>
      </div>
    </div>
  )
}
