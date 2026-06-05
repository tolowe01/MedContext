import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-chip px-2 py-0.5 text-tab font-body font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-mc-neutral-100 text-mc-neutral-900',
        accent: 'bg-mc-primary-400 text-white',
        destructive: 'bg-mc-danger-400 text-white',
        outline: 'border border-mc-neutral-200 text-mc-neutral-600',
        surface: 'bg-mc-surface-white border border-mc-neutral-200 text-mc-neutral-900',
        teal: 'bg-mc-teal-400 text-white',
        warning: 'bg-mc-warning-400 text-white',
        caution: 'bg-mc-caution-400 text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
