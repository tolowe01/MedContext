import LogoutButton from '@/components/shared/LogoutButton'

export default function PharmacistLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav className="sticky top-0 z-40 bg-mc-primary-800 border-b border-mc-primary-900">
        <div className="mx-auto w-full max-w-7xl px-screenX py-4 flex justify-between items-center">
          <span className="font-display-bold text-sectionTitle text-white">MedX</span>
          <LogoutButton className="text-white/80 hover:text-white hover:bg-mc-primary-600" />
        </div>
      </nav>
      <div className="mx-auto w-full max-w-7xl px-screenX">{children}</div>
    </>
  )
}
