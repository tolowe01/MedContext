'use client'

import { useState } from 'react'
import VerifiedReadingForm from '@/components/pharmacist/VerifiedReadingForm'
import ComparisonView from '@/components/pharmacist/ComparisonView'
import type { DailyLog, PharmacistVerifiedReading } from '@/lib/types'

interface VerifiedReadingClientWrapperProps {
  patientId: string
  latestPatientLog: DailyLog | null
  initialVerifiedReading: PharmacistVerifiedReading | null
}

export default function VerifiedReadingClientWrapper({
  patientId,
  latestPatientLog,
  initialVerifiedReading,
}: VerifiedReadingClientWrapperProps) {
  const [verifiedReading, setVerifiedReading] = useState<PharmacistVerifiedReading | null>(
    initialVerifiedReading
  )

  return (
    <div className="space-y-5">
      <VerifiedReadingForm patientId={patientId} onSave={setVerifiedReading} />
      <ComparisonView patientLog={latestPatientLog} pharmacistReading={verifiedReading} />
    </div>
  )
}
