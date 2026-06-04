import { logout } from '@/actions/auth'
import { Button } from '@/components/ui/button'

export default function PharmacistLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav className="bg-dialogue-nav px-6 py-4 flex justify-between items-center border-b border-dialogue-border">
        <span className="font-display-bold text-sectionTitle text-dialogue-text">MedContext</span>
        <form action={logout}>
          <Button
            type="submit"
            variant="ghost"
            className="text-dialogue-textMuted hover:text-dialogue-text font-body text-cta"
          >
            Log out
          </Button>
        </form>
      </nav>
      {children}
    </>
  )
}
