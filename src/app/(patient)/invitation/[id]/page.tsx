import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SOPHIE_TELUS_MEDS } from '@/lib/telus-meds'
import InvitationCard from '@/components/patient/InvitationCard'

interface InvitationPageProps {
  params: Promise<{ id: string }>
}

interface InvitationMedication {
  name: string
  dose: string
  frequency: string
}

const FALLBACK_MEDS: InvitationMedication[] = SOPHIE_TELUS_MEDS.map((med) => ({
  name: med.name,
  dose: med.dose,
  frequency: med.frequency,
}))

export default async function InvitationPage({ params }: InvitationPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: patient } = await supabase
    .from('patients')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (!patient) {
    return (
      <main className="min-h-screen bg-ln-canvas px-screenX pt-screenTop pb-20">
        <p className="font-ln-text text-body text-ln-inkMuted">Patient record not found.</p>
      </main>
    )
  }

  const { data: period } = await supabase
    .from('monitoring_periods')
    .select('id, status, pharmacist_id, medication_list_id')
    .eq('id', id)
    .eq('patient_id', patient.id)
    .maybeSingle()

  if (!period || period.status !== 'invited') {
    redirect('/tracking')
  }

  let pharmacistName = 'Your pharmacist'
  if (period.pharmacist_id) {
    const { data: pharmacist } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', period.pharmacist_id)
      .maybeSingle()
    if (pharmacist) {
      pharmacistName = `${pharmacist.first_name} ${pharmacist.last_name}`.trim()
    }
  }

  let medications: InvitationMedication[] = FALLBACK_MEDS
  if (period.medication_list_id) {
    const { data: meds } = await supabase
      .from('medications')
      .select('name, dose, frequency')
      .eq('medication_list_id', period.medication_list_id)
      .order('created_at', { ascending: true })
    if (meds && meds.length > 0) {
      medications = meds.map((med) => ({
        name: med.name,
        dose: med.dose,
        frequency: med.frequency,
      }))
    }
  }

  return (
    <main className="min-h-screen bg-ln-canvas px-screenX pt-screenTop pb-20">
      <h1 className="font-ln-display font-semibold text-screenTitle text-ln-ink mb-6">
        You are invited to start tracking
      </h1>
      <InvitationCard
        pharmacistName={pharmacistName}
        medications={medications}
        periodId={period.id}
      />
    </main>
  )
}
