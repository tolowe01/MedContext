import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-chip px-2 py-0.5 text-tab font-body-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-dialogue-chip text-dialogue-bg',
        accent: 'bg-dialogue-accent text-dialogue-bg',
        destructive: 'bg-emergency text-white',
        outline: 'border border-dialogue-border text-dialogue-textMuted',
        surface: 'bg-dialogue-surface border border-dialogue-border text-dialogue-text',
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
