import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex w-full rounded-button border border-dialogue-border bg-dialogue-surface px-4 py-3 text-body font-body text-dialogue-text placeholder:text-dialogue-textMuted focus:outline-none focus:border-dialogue-accent focus:ring-1 focus:ring-dialogue-accent disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-colors min-h-[80px]',
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
