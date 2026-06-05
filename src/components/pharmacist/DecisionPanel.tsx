'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { approveMonitoring, acknowledgeAlert } from '@/actions/monitoring'
import { decisionView } from '@/lib/monitoring-state'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import ConsultationSheet from '@/components/pharmacist/ConsultationSheet'
import EscalationSheet from '@/components/pharmacist/EscalationSheet'
import PostConsultationPanel from '@/components/pharmacist/PostConsultationPanel'
import type { MonitoringPeriod, Medication, CriticalAlert, Consultation } from '@/lib/types'

interface DecisionPanelProps {
  period: MonitoringPeriod
  medications: Medication[]
  unackedAlert: CriticalAlert | null
  consultation: Consultation | null
}

const DEFAULT_APPROVAL_MESSAGE =
  'Great work this week! Your blood pressure readings are looking stable and your medication adherence is excellent. Keep up the good habits and your pharmacist is here if you have any questions.'

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function physicianName(medications: Medication[]): string {
  const named = medications.find((m) => m.prescribing_physician_name)
  return named?.prescribing_physician_name ?? 'the prescribing physician'
}

function DecisionSummary({
  period,
  medications,
}: {
  period: MonitoringPeriod
  medications: Medication[]
}) {
  const decidedOn = formatDate(period.pharmacist_decision_at)

  let headline = 'Monitoring complete'
  let detail = ''
  if (period.status === 'approved') {
    headline = 'Approved'
    detail = decidedOn ? `Approved on ${decidedOn}.` : 'This monitoring period was approved.'
  } else if (period.status === 'monitor_extended') {
    headline = 'Monitoring extended'
    detail = 'Monitoring was extended for another 7 days after a consultation.'
  } else if (period.status === 'escalated') {
    headline = 'Escalated to physician'
    const doctor = physicianName(medications)
    detail = decidedOn
      ? `Escalated to ${doctor} on ${decidedOn}.`
      : `Escalated to ${doctor}.`
  }

  return (
    <div>
      <h3 className="font-ln-display text-base font-semibold tracking-ln-tight text-ln-ink">
        {headline}
      </h3>
      <p className="text-ln-inkSubtle text-sm mt-1">{detail}</p>
    </div>
  )
}

export default function DecisionPanel({
  period,
  medications,
  unackedAlert,
  consultation,
}: DecisionPanelProps) {
  const router = useRouter()
  const view = decisionView(period.status, !!unackedAlert)

  const [approvalMessage, setApprovalMessage] = useState(DEFAULT_APPROVAL_MESSAGE)
  const [approveOpen, setApproveOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAcknowledge() {
    if (!unackedAlert) return
    setSubmitting(true)
    setError(null)
    const result = await acknowledgeAlert(unackedAlert.id)
    setSubmitting(false)
    if ('error' in result) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  async function handleApprove() {
    setSubmitting(true)
    setError(null)
    const result = await approveMonitoring(period.id, approvalMessage)
    setSubmitting(false)
    if ('error' in result) {
      setError(result.error)
      return
    }
    setApproveOpen(false)
    router.refresh()
  }

  if (view.kind === 'monitoring') {
    return (
      <div className="ln-panel rounded-ln-lg p-6">
        <h3 className="font-ln-display text-base font-semibold tracking-ln-tight text-ln-ink">
          Monitoring in progress
        </h3>
        <p className="text-ln-inkSubtle text-sm mt-1">
          The patient is still logging readings. A decision becomes available once the period is
          submitted.
        </p>
      </div>
    )
  }

  if (view.kind === 'summary') {
    return (
      <div className="ln-panel rounded-ln-lg p-6">
        <DecisionSummary period={period} medications={medications} />
      </div>
    )
  }

  if (view.kind === 'post_consultation') {
    if (!consultation) {
      return (
        <div className="ln-panel rounded-ln-lg p-6">
          <p className="text-ln-inkSubtle text-sm">
            A consultation is scheduled but its details could not be loaded.
          </p>
        </div>
      )
    }
    return (
      <div className="ln-panel rounded-ln-lg p-6">
        <PostConsultationPanel
          consultation={consultation}
          period={period}
          medications={medications}
        />
      </div>
    )
  }

  // view.kind === 'decision'
  return (
    <div className="bg-ln-surface1 rounded-ln-lg p-5 space-y-4">
      <h3 className="font-ln-display font-semibold text-sectionTitle text-ln-ink">Decision</h3>

      {error && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-ln-md px-3 py-2">
          <p className="text-red-300 text-sm font-ln-text">{error}</p>
        </div>
      )}

      {view.showAcknowledge && unackedAlert && (
        <div className="bg-emergency/15 border border-emergency/40 rounded-ln-md px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-ln-ink font-ln-text text-sm">
            Critical reading: {unackedAlert.systolic}/{unackedAlert.diastolic}. Acknowledge before
            deciding.
          </p>
          <Button
            onClick={handleAcknowledge}
            disabled={submitting}
            variant="destructive"
            size="sm"
            className="rounded-ln-md shrink-0 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Acknowledge'}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Option 1: Approve */}
        <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
          <DialogTrigger asChild>
            <Button
              size="lg"
              className="w-full rounded-ln-md normal-case tracking-normal"
            >
              Approve
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-ln-surface1 border border-ln-hairline">
            <DialogHeader>
              <DialogTitle className="text-ln-ink font-ln-display font-semibold text-sectionTitle">
                Send positive message
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Label className="text-ln-ink font-ln-text text-sm">Message</Label>
              <Textarea
                value={approvalMessage}
                onChange={(e) => setApprovalMessage(e.target.value)}
                rows={6}
                className="bg-ln-canvas border-ln-hairline text-ln-ink font-ln-text text-body resize-none"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                onClick={handleApprove}
                disabled={submitting}
                className="rounded-ln-md disabled:opacity-50"
              >
                {submitting ? 'Sending...' : 'Approve and send'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setApproveOpen(false)}
                disabled={submitting}
                className="text-ln-inkMuted"
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Option 2: Request consultation */}
        <ConsultationSheet
          periodId={period.id}
          trigger={
            <Button
              size="lg"
              variant="outline"
              className="w-full rounded-ln-md normal-case tracking-normal"
            >
              Request consultation
            </Button>
          }
        />

        {/* Option 3: Escalate */}
        <EscalationSheet
          period={period}
          medications={medications}
          mode="direct"
          trigger={
            <Button
              size="lg"
              variant="destructive"
              className="w-full rounded-ln-md normal-case tracking-normal"
            >
              Escalate
            </Button>
          }
        />
      </div>
    </div>
  )
}
