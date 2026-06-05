'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Intervention, InterventionKind } from '@/lib/types'
import { Phone, FileText, CalendarDays, CheckCircle2 } from 'lucide-react'
import LottiePharmacist from '@/components/patient/LottiePharmacist'

function InterventionCard({ intervention }: { intervention: Intervention }) {
  const payload = intervention.payload ?? {}

  if (intervention.kind === 'approval') {
    return (
      <div className="bg-mc-surface-white border border-mc-neutral-200 rounded-cardLarge p-8 flex flex-col items-center text-center">
        <CheckCircle2 className="w-14 h-14 text-green-400 mb-4" />
        <LottiePharmacist loop={false} className="w-36 h-36 mb-4" />
        <h2 className="font-display-bold text-sectionTitle text-mc-neutral-900 mb-3">
          Great work this week!
        </h2>
        <p className="font-body text-body text-mc-neutral-400 leading-relaxed">
          Well done. Consistent monitoring combined with pharmacist review is associated with better
          outcomes in peer-reviewed studies.
        </p>
        <p className="text-xs text-mc-neutral-400 font-body mt-4 italic">
          Tucker et al., 2017
        </p>
      </div>
    )
  }

  if (intervention.kind === 'phone_call') {
    return (
      <div className="bg-mc-surface-white border border-mc-neutral-200 rounded-cardLarge p-8 flex flex-col items-center text-center">
        <Phone className="w-12 h-12 text-mc-primary-400 mb-4" />
        <h2 className="font-display-bold text-sectionTitle text-mc-neutral-900 mb-2">
          Your pharmacist will call you
        </h2>
        {payload.phone_time && (
          <p className="font-body text-body text-mc-neutral-400">
            Scheduled for{' '}
            <span className="text-mc-neutral-900 font-body-bold">{payload.phone_time}</span>
          </p>
        )}
      </div>
    )
  }

  if (intervention.kind === 'clinical_note') {
    return (
      <div className="bg-mc-surface-white border border-mc-neutral-200 rounded-cardLarge p-8">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-8 h-8 text-mc-primary-400" />
          <h2 className="font-display-bold text-sectionTitle text-mc-neutral-900">
            Note from your pharmacist
          </h2>
        </div>
        {payload.note_text && (
          <p className="font-body text-body text-mc-neutral-400 leading-relaxed whitespace-pre-wrap">
            {payload.note_text}
          </p>
        )}
      </div>
    )
  }

  if (intervention.kind === 'in_person') {
    return (
      <div className="bg-mc-surface-white border border-mc-neutral-200 rounded-cardLarge p-8 flex flex-col items-center text-center">
        <CalendarDays className="w-12 h-12 text-mc-primary-400 mb-4" />
        <h2 className="font-display-bold text-sectionTitle text-mc-neutral-900 mb-2">
          Please come in
        </h2>
        {payload.appointment_date && (
          <p className="font-body text-body text-mc-neutral-400">
            Appointment scheduled for{' '}
            <span className="text-mc-neutral-900 font-body-bold">{payload.appointment_date}</span>
          </p>
        )}
      </div>
    )
  }

  return null
}

function WaitingIndicator() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-full border-4 border-mc-neutral-200" />
        <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-t-mc-primary-400 animate-spin" />
      </div>
      <h2 className="font-display-bold text-sectionTitle text-mc-neutral-900 mb-2">
        Waiting for your pharmacist…
      </h2>
      <p className="font-body text-body text-mc-neutral-400 text-center max-w-xs">
        Your pharmacist is reviewing your week. You&apos;ll be notified as soon as they respond.
      </p>
    </div>
  )
}

function ReviewContent() {
  const searchParams = useSearchParams()
  const submissionId = searchParams.get('submissionId')
  const [intervention, setIntervention] = useState<Intervention | null>(null)
  const isPageFocused = useRef(true)

  useEffect(() => {
    function handleFocus() {
      isPageFocused.current = true
    }
    function handleBlur() {
      isPageFocused.current = false
    }
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)
    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

  useEffect(() => {
    if (!submissionId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`interventions:${submissionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'interventions',
          filter: `submission_id=eq.${submissionId}`,
        },
        (payload) => {
          const newIntervention = payload.new as Intervention
          setIntervention(newIntervention)

          if (!isPageFocused.current && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            const kindLabels: Record<InterventionKind, string> = {
              approval: 'Your pharmacist approved your week!',
              phone_call: 'Your pharmacist wants to call you.',
              clinical_note: 'Your pharmacist left a note.',
              in_person: 'Your pharmacist scheduled an appointment.',
            }
            new Notification('MedContext', {
              body: kindLabels[newIntervention.kind] ?? 'Your pharmacist responded.',
              icon: '/icon-192.png',
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [submissionId])

  return (
    <main className="min-h-screen bg-mc-surface-page px-screenX pt-screenTop pb-20">
      <h1 className="font-display-bold text-screenTitle text-mc-neutral-900 mb-8">Review</h1>

      {intervention ? (
        <InterventionCard intervention={intervention} />
      ) : (
        <WaitingIndicator />
      )}
    </main>
  )
}

export default function ReviewPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-mc-surface-page px-screenX pt-screenTop pb-20 flex items-center justify-center">
          <p className="font-body text-body text-mc-neutral-400 animate-pulse">Loading…</p>
        </main>
      }
    >
      <ReviewContent />
    </Suspense>
  )
}
