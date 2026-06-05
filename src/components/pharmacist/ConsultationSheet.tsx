'use client'

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { scheduleConsultation } from '@/actions/monitoring'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'

interface ConsultationSheetProps {
  periodId: string
  onDone?: () => void
  trigger: ReactNode
}

function toISO(date: string, time: string): string {
  // date is yyyy-MM-dd, time is HH:mm. Combine into a local datetime ISO string.
  return new Date(`${date}T${time}`).toISOString()
}

export default function ConsultationSheet({ periodId, onDone, trigger }: ConsultationSheetProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = Boolean(date) && Boolean(time)

  async function handleConfirm() {
    if (!canSubmit) {
      setError('Please choose both a date and a time.')
      return
    }
    setSubmitting(true)
    setError(null)

    const result = await scheduleConsultation(periodId, toISO(date, time))

    setSubmitting(false)
    if ('error' in result) {
      setError(result.error)
      return
    }
    setOpen(false)
    onDone?.()
    router.refresh()
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="bg-mc-surface-page border-l border-mc-neutral-200">
        <SheetHeader>
          <SheetTitle className="text-mc-neutral-900 font-display font-semibold text-sectionTitle">
            Schedule consultation
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {error && (
            <div className="bg-mc-danger-50 border border-mc-danger-100 rounded-button px-3 py-2">
              <p className="text-mc-danger-800 text-sm font-body">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-mc-neutral-900 font-body text-sm">Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-mc-surface-white border-mc-neutral-200 text-mc-neutral-900"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-mc-neutral-900 font-body text-sm">Time</Label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="bg-mc-surface-white border-mc-neutral-200 text-mc-neutral-900"
            />
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button
            onClick={handleConfirm}
            disabled={submitting || !canSubmit}
            className="rounded-button disabled:opacity-50"
          >
            {submitting ? 'Scheduling...' : 'Schedule consultation'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={submitting}
            className="text-mc-neutral-600"
          >
            Cancel
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
