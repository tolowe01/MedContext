'use client'

import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { AlertTriangle, Phone } from 'lucide-react'

interface CriticalReadingModalProps {
  pharmacyPhone: string
}

/**
 * Full-screen, non-dismissible alert shown when the just-saved reading is in
 * the critical range. The patient must use a CTA to leave; escape and
 * outside-click are blocked. The number could be measurement-affected, so the
 * copy urges action without making a diagnosis.
 */
export default function CriticalReadingModal({ pharmacyPhone }: CriticalReadingModalProps) {
  const router = useRouter()

  function handleClose() {
    router.refresh()
  }

  return (
    <Dialog open>
      <DialogContent
        className="max-w-lg border-2 border-emergency [&>button]:hidden"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <div className="flex flex-col items-center text-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emergency/15">
            <AlertTriangle className="h-7 w-7 text-emergency" aria-hidden="true" />
          </span>

          <DialogTitle className="text-screenTitle">This reading is very high</DialogTitle>

          <p className="font-ln-text text-body text-ln-ink leading-relaxed">
            The blood pressure you just entered is in a range that can be dangerous. This is not
            medical advice, and the number could be affected by how you measured it. To be safe,
            please get help now.
          </p>

          <p className="font-ln-text text-body text-ln-ink leading-relaxed">
            If you have chest pain, trouble breathing, a severe headache, weakness on one side, or
            trouble speaking, call 911 right away.
          </p>

          <p className="font-ln-text text-sm text-ln-inkMuted leading-relaxed">
            Your reading has been saved and your pharmacist has been notified.
          </p>

          <div className="flex w-full flex-col gap-3 mt-2">
            <a
              href="tel:911"
              className="inline-flex w-full items-center justify-center gap-2 rounded-ln-md bg-emergency px-6 py-4 font-ln-text font-semibold text-cta uppercase tracking-wide text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ln-surface1"
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              Call 911
            </a>

            <a
              href={`tel:${pharmacyPhone}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-ln-md border border-ln-hairline bg-transparent px-6 py-4 font-ln-text font-semibold text-cta uppercase tracking-wide text-ln-ink transition-colors hover:bg-ln-surface2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ln-primary focus-visible:ring-offset-2 focus-visible:ring-offset-ln-surface1"
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              Call my pharmacist
            </a>

            <button
              type="button"
              onClick={handleClose}
              className="w-full rounded-ln-md px-6 py-3 font-ln-text text-body text-ln-inkMuted transition-colors hover:text-ln-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ln-primary focus-visible:ring-offset-2 focus-visible:ring-offset-ln-surface1"
            >
              I have done this, close
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
