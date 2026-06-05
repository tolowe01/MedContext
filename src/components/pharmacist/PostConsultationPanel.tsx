'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { completeConsultationExtend, completeConsultationEscalate } from '@/actions/monitoring'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import EscalationSheet from '@/components/pharmacist/EscalationSheet'
import type { Consultation, MonitoringPeriod, Medication } from '@/lib/types'

interface PostConsultationPanelProps {
  consultation: Consultation
  period: MonitoringPeriod
  medications: Medication[]
}

function formatScheduledFor(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function PostConsultationPanel({
  consultation,
  period,
  medications,
}: PostConsultationPanelProps) {
  const router = useRouter()
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleExtend() {
    setSubmitting(true)
    setError(null)

    const result = await completeConsultationExtend(consultation.id, notes)

    setSubmitting(false)
    if ('error' in result) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display font-semibold text-sectionTitle text-mc-neutral-900">
          Consultation scheduled
        </h3>
        <p className="text-mc-neutral-600 font-body text-sm mt-1">
          {formatScheduledFor(consultation.scheduled_for)}
        </p>
      </div>

      {error && (
        <div className="bg-mc-danger-50 border border-mc-danger-100 rounded-button px-3 py-2">
          <p className="text-mc-danger-800 text-sm font-body">{error}</p>
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-mc-neutral-900 font-body text-sm">Consultation notes</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          placeholder="Summarize what was discussed and the plan."
          className="bg-mc-surface-white border-mc-neutral-200 text-mc-neutral-900 font-body text-body resize-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button
          onClick={handleExtend}
          disabled={submitting}
          variant="outline"
          className="w-full rounded-button font-body text-sm normal-case tracking-normal disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Complete and extend monitoring 7 more days'}
        </Button>

        <EscalationSheet
          period={period}
          medications={medications}
          mode="post_consultation"
          onConfirm={(reason) => completeConsultationEscalate(consultation.id, reason, notes)}
          trigger={
            <Button
              variant="destructive"
              disabled={submitting}
              className="w-full rounded-button font-body text-sm normal-case tracking-normal disabled:opacity-50"
            >
              Complete and escalate to physician
            </Button>
          }
        />
      </div>
    </div>
  )
}
