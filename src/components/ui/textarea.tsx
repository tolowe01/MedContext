import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex w-full rounded-button border border-mc-neutral-300 bg-mc-surface-white px-4 py-3 text-body font-body text-mc-neutral-900 placeholder:text-mc-neutral-400 focus:outline-none focus:border-mc-primary-400 focus:ring-1 focus:ring-mc-primary-200 disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-colors min-h-[80px]',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
