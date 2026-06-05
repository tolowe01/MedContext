import Link from 'next/link'
import EmergencyBanner from '@/components/shared/EmergencyBanner'
import DisclaimerFooter from '@/components/shared/DisclaimerFooter'
import LogoutButton from '@/components/shared/LogoutButton'
import BottomTabNav from '@/components/shared/BottomTabNav'

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <EmergencyBanner />
      <header className="sticky top-0 z-40 bg-mc-surface-white border-b border-mc-neutral-200">
        <div className="mx-auto w-full max-w-xl px-screenX py-2.5 flex items-center justify-between">
          <span className="font-display font-semibold text-sm text-mc-neutral-900 tracking-tight">
            MedContext
          </span>
          <div className="flex items-center gap-2">
            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/home"
                className="rounded-button px-3 py-2 text-sm font-body text-mc-neutral-600 hover:text-mc-neutral-900 hover:bg-mc-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-primary-200 transition-colors"
              >
                Home
              </Link>
              <Link
                href="/tracking"
                className="rounded-button px-3 py-2 text-sm font-body text-mc-neutral-600 hover:text-mc-neutral-900 hover:bg-mc-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-primary-200 transition-colors"
              >
                Track
              </Link>
              <Link
                href="/submit"
                className="rounded-button px-3 py-2 text-sm font-body text-mc-neutral-600 hover:text-mc-neutral-900 hover:bg-mc-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-primary-200 transition-colors"
              >
                Submit
              </Link>
              <Link
                href="/progress"
                className="rounded-button px-3 py-2 text-sm font-body text-mc-neutral-600 hover:text-mc-neutral-900 hover:bg-mc-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-primary-200 transition-colors"
              >
                Progress
              </Link>
            </nav>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-xl">{children}</div>
      <DisclaimerFooter />
      <BottomTabNav />
    </>
  )
}
