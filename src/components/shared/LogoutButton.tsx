import { logout } from '@/actions/auth'
import { Button, type ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { LogOut } from 'lucide-react'

interface LogoutButtonProps {
  className?: string
  size?: ButtonProps['size']
}

/**
 * Always-available sign-out control. Renders a server-action form so it works
 * inside server-component layouts (patient, pharmacist) without client JS.
 */
export default function LogoutButton({ className, size = 'sm' }: LogoutButtonProps) {
  return (
    <form action={logout}>
      <Button
        type="submit"
        variant="ghost"
        size={size}
        className={cn(
          'gap-1.5 normal-case tracking-normal text-mc-neutral-400 hover:text-mc-neutral-900 hover:bg-mc-neutral-100 mc-focus',
          className
        )}
      >
        <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
        Log out
      </Button>
    </form>
  )
}
