'use client'

import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="min-h-screen bg-mc-surface-page px-screenX flex flex-col items-center justify-center text-center gap-4">
      <h1 className="font-display-bold text-screenTitle text-mc-neutral-900">Something went wrong</h1>
      <p className="font-body text-body text-mc-neutral-600 max-w-md">
        We hit an unexpected error. You can try again, and if it keeps happening, please contact
        support.
      </p>
      <Button onClick={reset}>
        <RefreshCw className="w-4 h-4 mr-2" />
        Try again
      </Button>
    </main>
  )
}
