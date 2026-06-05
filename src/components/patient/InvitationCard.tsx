'use client'

import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Pill } from 'lucide-react'
import { acceptInvitation } from '@/actions/accept-invitation'

interface InvitationMedication {
  name: string
  dose: string
  frequency: string
}

interface InvitationCardProps {
  pharmacistName: string
  medications: InvitationMedication[]
  periodId: string
}

function AcceptButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      {pending ? 'Starting…' : 'I understand, begin tracking'}
    </Button>
  )
}

export default function InvitationCard({
  pharmacistName,
  medications,
  periodId,
}: InvitationCardProps) {
  return (
    <div className="bg-ln-surface1 border border-ln-hairline rounded-ln-xl p-8 flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="font-ln-text text-body text-ln-inkMuted">
          You have been invited to a 7-day monitoring period by
        </p>
        <p className="font-ln-display font-semibold text-sectionTitle text-ln-ink">{pharmacistName}</p>
      </div>

      <div className="flex flex-col gap-3">
        <p className="font-ln-text font-semibold text-cta text-ln-inkMuted uppercase tracking-wide">
          Medications we will track
        </p>
        <ul className="flex flex-col gap-2">
          {medications.map((med, index) => (
            <li
              key={`${med.name}-${index}`}
              className="flex items-start gap-3 bg-ln-surface2/10 border border-ln-hairline rounded-ln-lg px-4 py-3"
            >
              <Pill className="h-5 w-5 text-ln-primary shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex flex-col">
                <span className="font-ln-text font-semibold text-body text-ln-ink">{med.name}</span>
                <span className="font-ln-text text-sm text-ln-inkMuted">
                  {med.dose} · {med.frequency}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <form action={acceptInvitation.bind(null, periodId)}>
        <AcceptButton />
      </form>
    </div>
  )
}
