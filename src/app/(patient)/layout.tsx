import EmergencyBanner from '@/components/shared/EmergencyBanner'
import DisclaimerFooter from '@/components/shared/DisclaimerFooter'
import LogoutButton from '@/components/shared/LogoutButton'

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <EmergencyBanner />
      <header className="bg-ln-canvas border-b border-ln-hairline px-4 py-2.5 flex items-center justify-between">
        <span className="font-ln-display font-semibold text-sm text-ln-ink tracking-ln-tight">
          MedContext
        </span>
        <LogoutButton />
      </header>
      {children}
      <DisclaimerFooter />
    </>
  )
}
