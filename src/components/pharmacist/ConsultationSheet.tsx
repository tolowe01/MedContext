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
      <SheetContent className="bg-ln-canvas border-l border-ln-hairline">
        <SheetHeader>
          <SheetTitle className="text-ln-ink font-ln-display font-semibold text-sectionTitle">
            Schedule consultation
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {error && (
            <div className="bg-red-900/30 border border-red-700/50 rounded-ln-md px-3 py-2">
              <p className="text-red-300 text-sm font-ln-text">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-ln-ink font-ln-text text-sm">Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-ln-surface1 border-ln-hairline text-ln-ink"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-ln-ink font-ln-text text-sm">Time</Label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="bg-ln-surface1 border-ln-hairline text-ln-ink"
            />
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button
            onClick={handleConfirm}
            disabled={submitting || !canSubmit}
            className="rounded-ln-md disabled:opacity-50"
          >
            {submitting ? 'Scheduling...' : 'Schedule consultation'}
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
