'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fetchPriorMedicationNames } from '@/actions/medication-lists'
import { markNewMedications } from '@/lib/medication-comparison'
import PatientBasicsForm from '@/components/pharmacist/PatientBasicsForm'
import MedicationUploadDropzone from '@/components/pharmacist/MedicationUploadDropzone'
import MedicationConfirmTable from '@/components/pharmacist/MedicationConfirmTable'
import MonitoringPeriodForm from '@/components/pharmacist/MonitoringPeriodForm'
import type { ExtractedMed } from '@/lib/types'

type Step = 'A' | 'B' | 'C' | 'D'

const STEP_ORDER: Step[] = ['A', 'B', 'C', 'D']

const STEP_LABELS: Record<Step, string> = {
  A: 'Patient basics',
  B: 'Upload list',
  C: 'Confirm medications',
  D: 'Monitoring period',
}

function parseStep(value: string | null): Step {
  return value === 'B' || value === 'C' || value === 'D' ? value : 'A'
}

function WizardProgress({ current }: { current: Step }) {
  const currentIndex = STEP_ORDER.indexOf(current)
  return (
    <ol className="flex items-center gap-3 mb-10" aria-label="Onboarding steps">
      {STEP_ORDER.map((step, index) => {
        const done = index < currentIndex
        const active = index === currentIndex
        return (
          <li key={step} className="flex items-center gap-2.5 flex-1 min-w-0">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-body font-medium text-xs transition-colors ${
                active
                  ? 'bg-mc-primary-400 text-white'
                  : done
                    ? 'bg-mc-neutral-100 text-mc-neutral-900 border border-mc-neutral-300'
                    : 'bg-mc-surface-white text-mc-neutral-400 border border-mc-neutral-200'
              }`}
            >
              {index + 1}
            </span>
            <span
              className={`font-body text-xs truncate hidden sm:inline ${
                active ? 'text-mc-neutral-900' : 'text-mc-neutral-400'
              }`}
            >
              {STEP_LABELS[step]}
            </span>
            {index < STEP_ORDER.length - 1 && (
              <span
                aria-hidden="true"
                className={`hidden sm:block h-px flex-1 ${
                  done ? 'bg-mc-neutral-200' : 'bg-mc-neutral-200'
                }`}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}

function NewPatientWizard() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [step, setStep] = useState<Step>(() => parseStep(searchParams.get('step')))
  const [pharmacyId, setPharmacyId] = useState<string | null>(null)
  const [pharmacyError, setPharmacyError] = useState<string | null>(null)

  const [patientId, setPatientId] = useState<string | null>(searchParams.get('patientId'))
  const [medicationListId, setMedicationListId] = useState<string | null>(
    searchParams.get('medicationListId')
  )
  const [medications, setMedications] = useState<ExtractedMed[]>([])
  const [rawExtraction, setRawExtraction] = useState('')

  // Resolve the pharmacist's pharmacy on mount.
  useEffect(() => {
    let cancelled = false
    async function loadPharmacy() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('pharmacy_id')
        .eq('id', user.id)
        .single()
      if (cancelled) return
      if (!profile?.pharmacy_id) {
        setPharmacyError('No pharmacy is associated with your account.')
        return
      }
      setPharmacyId(profile.pharmacy_id)
    }
    void loadPharmacy()
    return () => {
      cancelled = true
    }
  }, [router])

  // Sync wizard state into the URL so a refresh resumes where we left off.
  const syncUrl = useCallback(
    (next: { step: Step; patientId: string | null; medicationListId: string | null }) => {
      const params = new URLSearchParams()
      params.set('step', next.step)
      if (next.patientId) params.set('patientId', next.patientId)
      if (next.medicationListId) params.set('medicationListId', next.medicationListId)
      router.replace(`/patient/new?${params.toString()}`)
    },
    [router]
  )

  useEffect(() => {
    syncUrl({ step, patientId, medicationListId })
  }, [step, patientId, medicationListId, syncUrl])

  const handleBasicsComplete = useCallback((newPatientId: string) => {
    setPatientId(newPatientId)
    setStep('B')
  }, [])

  const handleExtracted = useCallback(
    async (payload: { medicationListId: string; medications: ExtractedMed[]; raw: string }) => {
      setMedicationListId(payload.medicationListId)
      setRawExtraction(payload.raw)

      let flagged = payload.medications
      if (patientId) {
        const priorNames = await fetchPriorMedicationNames(patientId, payload.medicationListId)
        flagged = markNewMedications(payload.medications, priorNames)
      }
      setMedications(flagged)
      setStep('C')
    },
    [patientId]
  )

  const handleConfirmed = useCallback(() => {
    setStep('D')
  }, [])

  const handleReplace = useCallback(() => {
    setMedications([])
    setRawExtraction('')
    setMedicationListId(null)
    setStep('B')
  }, [])

  const handleCreated = useCallback(() => {
    router.push('/dashboard')
  }, [router])

  const content = useMemo(() => {
    if (pharmacyError) {
      return <p className="font-body text-sm text-emergency">{pharmacyError}</p>
    }

    if (step === 'A') {
      return <PatientBasicsForm onComplete={handleBasicsComplete} />
    }

    if (!patientId) {
      return (
        <p className="font-body text-sm text-mc-neutral-600">
          Please create the patient account first.
        </p>
      )
    }

    if (step === 'B') {
      if (!pharmacyId) {
        return (
          <p className="font-body text-sm text-mc-neutral-400 animate-pulse">
            Loading your pharmacy...
          </p>
        )
      }
      return (
        <MedicationUploadDropzone
          pharmacyId={pharmacyId}
          patientId={patientId}
          onExtracted={handleExtracted}
        />
      )
    }

    if (step === 'C') {
      if (!medicationListId) {
        return (
          <p className="font-body text-sm text-mc-neutral-600">
            Please upload a medication list first.
          </p>
        )
      }
      return (
        <MedicationConfirmTable
          medicationListId={medicationListId}
          initialRows={medications}
          rawExtraction={rawExtraction}
          onConfirmed={handleConfirmed}
          onReplace={handleReplace}
        />
      )
    }

    if (!medicationListId) {
      return (
        <p className="font-body text-sm text-mc-neutral-600">
          Please confirm the medication list first.
        </p>
      )
    }
    return (
      <MonitoringPeriodForm
        patientId={patientId}
        medicationListId={medicationListId}
        onCreated={handleCreated}
      />
    )
  }, [
    step,
    pharmacyId,
    pharmacyError,
    patientId,
    medicationListId,
    medications,
    rawExtraction,
    handleBasicsComplete,
    handleExtracted,
    handleConfirmed,
    handleReplace,
    handleCreated,
  ])

  return (
    <main className="min-h-screen bg-mc-surface-page text-mc-neutral-900 font-body py-12">
      <div className="mx-auto w-full max-w-2xl mc-rise">
        <p className="text-xs font-medium tracking-wide uppercase text-mc-neutral-400 mb-3">Onboarding</p>
        <h1 className="font-display text-3xl font-semibold -tracking-[0.022em] text-mc-neutral-900 mb-2">
          New patient
        </h1>
        <p className="font-body text-sm text-mc-neutral-600 mb-10">
          Onboard a patient, capture their medications, and start monitoring.
        </p>
        <WizardProgress current={step} />
        <div className="bg-mc-surface-white border border-mc-neutral-200 shadow-sm rounded-card p-6">{content}</div>
      </div>
    </main>
  )
}

export default function NewPatientPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-mc-surface-page text-mc-neutral-900 font-body py-12 flex items-center justify-center">
          <p className="font-body text-sm text-mc-neutral-400 animate-pulse">Loading...</p>
        </main>
      }
    >
      <NewPatientWizard />
    </Suspense>
  )
}
