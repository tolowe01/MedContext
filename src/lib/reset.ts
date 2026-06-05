import { createClient } from '@supabase/supabase-js'
import { format } from 'date-fns'

async function reset() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    console.error('Cannot reset: real NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in .env.local')
    process.exit(1)
  }

  const supabase = createClient(url, serviceKey)

  // Find demo patient
  const { data } = await supabase.auth.admin.listUsers()
  const patientId = data?.users?.find((u) => u.email === 'patient@demo')?.id

  if (!patientId) {
    console.error('Patient not found')
    process.exit(1)
  }

  // Find patient record
  const { data: patient } = await supabase
    .from('patients')
    .select('id')
    .eq('profile_id', patientId)
    .single()

  if (patient) {
    // Delete today's log
    const today = format(new Date(), 'yyyy-MM-dd')
    const { error: deleteError } = await supabase
      .from('daily_logs')
      .delete()
      .eq('patient_id', patient.id)
      .eq('log_date', today)

    if (deleteError) {
      console.error('Error deleting today log:', deleteError.message)
    } else {
      console.log("✅ Deleted today's daily log.")
    }

    // Reset baseline questionnaire
    const { error: updateError } = await supabase
      .from('patients')
      .update({ baseline_questionnaire: null })
      .eq('id', patient.id)

    if (updateError) {
      console.error('Error resetting onboarding:', updateError.message)
    } else {
      console.log('✅ Reset onboarding (baseline questionnaire).')
    }
  }

  console.log('Reset complete! You can now test the flow from the beginning.')
}

reset().catch((err) => {
  console.error(err)
  process.exit(1)
})
