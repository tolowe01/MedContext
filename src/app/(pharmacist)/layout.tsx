import LogoutButton from '@/components/shared/LogoutButton'

export default function PharmacistLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav className="bg-ln-canvas px-6 py-3 flex justify-between items-center border-b border-ln-hairline">
        <span className="font-ln-display font-semibold text-ln-ink tracking-ln-tight">
          MedContext
        </span>
        <LogoutButton />
      </nav>
      {children}
    </>
  )
}
