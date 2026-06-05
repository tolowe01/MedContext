import EmergencyBanner from '@/components/shared/EmergencyBanner'
import DisclaimerFooter from '@/components/shared/DisclaimerFooter'
import LogoutButton from '@/components/shared/LogoutButton'

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <EmergencyBanner />
      <header className="bg-mc-surface-white border-b border-mc-neutral-200 px-4 py-2.5 flex items-center justify-between">
        <span className="font-display font-semibold text-sm text-mc-neutral-900 tracking-tight">
          MedContext
        </span>
        <LogoutButton />
      </header>
      {children}
      <DisclaimerFooter />
    </>
  )
}
