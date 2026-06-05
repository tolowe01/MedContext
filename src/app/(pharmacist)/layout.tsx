import LogoutButton from '@/components/shared/LogoutButton'

export default function PharmacistLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav className="bg-mc-primary-800 px-6 py-4 flex justify-between items-center border-b border-mc-primary-900">
        <span className="font-display-bold text-sectionTitle text-white">MedContext</span>
        <LogoutButton className="text-white/80 hover:text-white hover:bg-mc-primary-600" />
      </nav>
      {children}
    </>
  )
}
