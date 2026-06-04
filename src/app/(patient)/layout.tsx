import EmergencyBanner from '@/components/shared/EmergencyBanner'
import DisclaimerFooter from '@/components/shared/DisclaimerFooter'

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <EmergencyBanner />
      {children}
      <DisclaimerFooter />
    </>
  )
}
