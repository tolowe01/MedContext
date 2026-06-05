'use client'

import { useState } from 'react'
import { createIntervention } from '@/actions/intervention'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet'
import type { SubmissionStatus } from '@/lib/types'

interface InterventionPanelProps {
  submissionId: string
  currentStatus: SubmissionStatus
}

const DEFAULT_APPROVAL_MESSAGE =
  'Great work this week! Your blood pressure readings are looking stable and your medication adherence is excellent. Keep up the good habits — your pharmacist is here if you have any questions.'

export default function InterventionPanel({ submissionId, currentStatus }: InterventionPanelProps) {
  const [approvalMessage, setApprovalMessage] = useState(DEFAULT_APPROVAL_MESSAGE)
  const [phoneTime, setPhoneTime] = useState('')
  const [clinicalNote, setClinicalNote] = useState('')
  const [appointmentDate, setAppointmentDate] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isComplete = currentStatus === 'reviewed' || currentStatus === 'follow_up'

  async function submit(
    kind: Parameters<typeof createIntervention>[1],
    payload: Parameters<typeof createIntervention>[2]
  ) {
    setSubmitting(true)
    setError(null)
    const result = await createIntervention(submissionId, kind, payload)
    setSubmitting(false)
    if (result?.error) {
      setError(result.error)
    }
  }

  if (isComplete) {
    return (
      <div className="bg-mc-surface-white rounded-card p-4">
        <p className="text-teal-400 font-body-bold text-cta">Review complete</p>
        <p className="text-mc-neutral-400 font-body text-sm mt-1">
          Status:{' '}
          <span className="text-mc-neutral-900 capitalize">{currentStatus.replace('_', ' ')}</span>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="font-display-semi text-sectionTitle text-mc-neutral-900">Interventions</h3>

      {error && (
        <div className="bg-mc-danger-50 border border-mc-danger-100 rounded-button px-3 py-2">
          <p className="text-mc-danger-800 text-sm font-body">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Approve */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              className="w-full border-mc-neutral-200 text-mc-neutral-900 hover:bg-mc-surface-white font-body text-sm rounded-button"
            >
              Approve — send positive message
            </Button>
          </SheetTrigger>
          <SheetContent className="bg-mc-surface-page border-mc-neutral-200">
            <SheetHeader>
              <SheetTitle className="text-mc-neutral-900 font-display-semi text-sectionTitle">
                Send positive message
              </SheetTitle>
            </SheetHeader>
            <div className="py-4 space-y-3">
              <Label className="text-mc-neutral-900 font-body text-sm">Message (optional)</Label>
              <Textarea
                value={approvalMessage}
                onChange={(e) => setApprovalMessage(e.target.value)}
                rows={5}
                className="bg-mc-surface-white border-mc-neutral-200 text-mc-neutral-900 font-body text-body resize-none"
              />
            </div>
            <SheetFooter className="gap-2">
              <SheetClose asChild>
                <Button
                  onClick={() => submit('approval', { message: approvalMessage })}
                  disabled={submitting}
                  className="bg-mc-primary-400 hover:bg-mc-primary-600 text-white font-cta text-cta rounded-button disabled:opacity-50"
                >
                  {submitting ? 'Sending…' : 'Send'}
                </Button>
              </SheetClose>
              <SheetClose asChild>
                <Button variant="ghost" className="text-mc-neutral-400">
                  Cancel
                </Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* Phone call */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              className="w-full border-mc-neutral-200 text-mc-neutral-900 hover:bg-mc-surface-white font-body text-sm rounded-button"
            >
              Schedule phone call
            </Button>
          </SheetTrigger>
          <SheetContent className="bg-mc-surface-page border-mc-neutral-200">
            <SheetHeader>
              <SheetTitle className="text-mc-neutral-900 font-display-semi text-sectionTitle">
                Schedule phone call
              </SheetTitle>
            </SheetHeader>
            <div className="py-4 space-y-3">
              <Label className="text-mc-neutral-900 font-body text-sm">Preferred call time</Label>
              <Input
                type="time"
                value={phoneTime}
                onChange={(e) => setPhoneTime(e.target.value)}
                className="bg-mc-surface-white border-mc-neutral-200 text-mc-neutral-900"
              />
            </div>
            <SheetFooter className="gap-2">
              <SheetClose asChild>
                <Button
                  onClick={() => submit('phone_call', { phone_time: phoneTime })}
                  disabled={submitting}
                  className="bg-mc-primary-400 hover:bg-mc-primary-600 text-white font-cta text-cta rounded-button disabled:opacity-50"
                >
                  {submitting ? 'Scheduling…' : 'Schedule'}
                </Button>
              </SheetClose>
              <SheetClose asChild>
                <Button variant="ghost" className="text-mc-neutral-400">
                  Cancel
                </Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* Clinical note */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              className="w-full border-mc-neutral-200 text-mc-neutral-900 hover:bg-mc-surface-white font-body text-sm rounded-button"
            >
              Send clinical note
            </Button>
          </SheetTrigger>
          <SheetContent className="bg-mc-surface-page border-mc-neutral-200">
            <SheetHeader>
              <SheetTitle className="text-mc-neutral-900 font-display-semi text-sectionTitle">
                Clinical note
              </SheetTitle>
            </SheetHeader>
            <div className="py-4 space-y-3">
              <Label className="text-mc-neutral-900 font-body text-sm">Note</Label>
              <Textarea
                value={clinicalNote}
                onChange={(e) => setClinicalNote(e.target.value)}
                rows={6}
                placeholder="Enter clinical note…"
                className="bg-mc-surface-white border-mc-neutral-200 text-mc-neutral-900 font-body text-body resize-none"
              />
            </div>
            <SheetFooter className="gap-2">
              <SheetClose asChild>
                <Button
                  onClick={() => submit('clinical_note', { note_text: clinicalNote })}
                  disabled={submitting || !clinicalNote.trim()}
                  className="bg-mc-primary-400 hover:bg-mc-primary-600 text-white font-cta text-cta rounded-button disabled:opacity-50"
                >
                  {submitting ? 'Sending…' : 'Send note'}
                </Button>
              </SheetClose>
              <SheetClose asChild>
                <Button variant="ghost" className="text-mc-neutral-400">
                  Cancel
                </Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* In-person appointment */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              className="w-full border-mc-neutral-200 text-mc-neutral-900 hover:bg-mc-surface-white font-body text-sm rounded-button"
            >
              Invite to in-person appointment
            </Button>
          </SheetTrigger>
          <SheetContent className="bg-mc-surface-page border-mc-neutral-200">
            <SheetHeader>
              <SheetTitle className="text-mc-neutral-900 font-display-semi text-sectionTitle">
                In-person appointment
              </SheetTitle>
            </SheetHeader>
            <div className="py-4 space-y-3">
              <Label className="text-mc-neutral-900 font-body text-sm">Appointment date</Label>
              <Input
                type="date"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="bg-mc-surface-white border-mc-neutral-200 text-mc-neutral-900"
              />
            </div>
            <SheetFooter className="gap-2">
              <SheetClose asChild>
                <Button
                  onClick={() => submit('in_person', { appointment_date: appointmentDate })}
                  disabled={submitting || !appointmentDate}
                  className="bg-mc-primary-400 hover:bg-mc-primary-600 text-white font-cta text-cta rounded-button disabled:opacity-50"
                >
                  {submitting ? 'Sending…' : 'Send invite'}
                </Button>
              </SheetClose>
              <SheetClose asChild>
                <Button variant="ghost" className="text-mc-neutral-400">
                  Cancel
                </Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}
