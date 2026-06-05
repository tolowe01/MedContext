import { logout } from '@/actions/auth'
import { Button } from '@/components/ui/button'

export default function PharmacistLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav className="bg-mc-primary-800 px-6 py-4 flex justify-between items-center border-b border-mc-primary-900">
        <span className="font-display-bold text-sectionTitle text-white">MedContext</span>
        <form action={logout}>
          <Button
            type="submit"
            variant="ghost"
            className="text-white/80 hover:text-white hover:bg-mc-primary-600 font-body text-cta"
          >
            Log out
          </Button>
        </form>
      </nav>
      {children}
    </>
  )
}
