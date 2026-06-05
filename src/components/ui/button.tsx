import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-button font-body-bold text-cta uppercase tracking-wide transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dialogue-accent focus-visible:ring-offset-2 focus-visible:ring-offset-dialogue-bg disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-dialogue-accent text-dialogue-bg hover:opacity-90',
        outline:
          'border border-dialogue-border text-dialogue-text bg-transparent hover:bg-dialogue-surface',
        ghost:
          'text-dialogue-textMuted hover:text-dialogue-text hover:bg-dialogue-surface',
        destructive:
          'bg-emergency text-white hover:opacity-90',
      },
      size: {
        default: 'h-12 px-6 py-3',
        sm: 'h-9 px-4 py-2 text-xs',
        lg: 'h-14 px-8 py-4 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
