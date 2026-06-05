'use client'

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { escalateToPhysician, type ActionResult } from '@/actions/monitoring'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import type { MonitoringPeriod, Medication } from '@/lib/types'

interface EscalationSheetProps {
  period: MonitoringPeriod
  medications: Medication[]
  mode?: 'direct' | 'post_consultation'
  onConfirm?: (reason: string) => Promise<ActionResult>
  trigger: ReactNode
}

const SHARED_ITEMS = [
  '7-day blood pressure trends',
  'Confirmed medication list',
  'Adherence summary',
  'Consultation notes',
] as const

function physicianName(medications: Medication[]): string {
  const named = medications.find((m) => m.prescribing_physician_name)
  return named?.prescribing_physician_name ?? 'the prescribing physician'
}

export default function EscalationSheet({
  period,
  medications,
  mode = 'direct',
  onConfirm,
  trigger,
}: EscalationSheetProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const doctor = physicianName(medications)
  const trimmedReason = reason.trim()

  async function handleConfirm() {
    if (!trimmedReason) {
      setError('A reason is required to escalate.')
      return
    }
    setSubmitting(true)
    setError(null)

    const result =
      mode === 'direct' || !onConfirm
        ? await escalateToPhysician(period.id, trimmedReason)
        : await onConfirm(trimmedReason)

    setSubmitting(false)
    if ('error' in result) {
      setError(result.error)
      return
    }
    setOpen(false)
    router.refresh()
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="bg-ln-canvas border-l border-ln-hairline overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-ln-ink font-ln-display font-semibold text-sectionTitle">
            Escalate to {doctor}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5">
          <div>
            <p className="text-ln-inkMuted font-ln-text text-sm mb-2">
              The following will be shared with {doctor}:
            </p>
            <ul className="space-y-1.5">
              {SHARED_ITEMS.map((item) => (
                <li
                  key={item}
                  className="text-ln-ink font-ln-text text-sm flex items-start gap-2"
                >
                  <span className="text-ln-primary" aria-hidden>
                    &bull;
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700/50 rounded-ln-md px-3 py-2">
              <p className="text-red-300 text-sm font-ln-text">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-ln-ink font-ln-text text-sm">
              Reason for escalation (required)
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
              placeholder="Describe why this patient needs physician review."
              className="bg-ln-surface1 border-ln-hairline text-ln-ink font-ln-text text-body resize-none"
            />
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button
            onClick={handleConfirm}
            disabled={submitting || !trimmedReason}
            variant="destructive"
            className="rounded-ln-md disabled:opacity-50"
          >
            {submitting ? 'Escalating...' : 'Confirm escalation'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={submitting}
            className="text-ln-inkMuted"
          >
            Cancel
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
