'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Activity, Send, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/tracking', label: 'Track', icon: Activity },
  { href: '/submit', label: 'Submit', icon: Send },
  { href: '/progress', label: 'Progress', icon: TrendingUp },
] as const

const HIDDEN_PREFIXES = ['/onboarding', '/invitation', '/review']

export default function BottomTabNav() {
  const pathname = usePathname()

  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null
  }

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 inset-x-0 z-40 border-t border-mc-neutral-200 bg-mc-surface-white md:hidden"
    >
      <div className="mx-auto w-full max-w-xl flex items-stretch justify-around">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 min-h-[64px] py-2 text-tab font-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-mc-primary-200',
                active ? 'text-mc-primary-600' : 'text-mc-neutral-600'
              )}
            >
              <tab.icon className="h-5 w-5" aria-hidden="true" />
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
