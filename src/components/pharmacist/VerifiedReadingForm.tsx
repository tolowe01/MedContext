'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { PharmacistVerifiedReading } from '@/lib/types'

interface VerifiedReadingFormProps {
  patientId: string
  onSave: (reading: PharmacistVerifiedReading) => void
}

interface FormState {
  systolic: string
  diastolic: string
  reading_date: string
}

const INITIAL_FORM: FormState = {
  systolic: '',
  diastolic: '',
  reading_date: new Date().toISOString().split('T')[0],
}

export default function VerifiedReadingForm({ patientId, onSave }: VerifiedReadingFormProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  function updateField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setConfirmed(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const systolic = Number(form.systolic)
    const diastolic = Number(form.diastolic)

    if (!systolic || !diastolic || systolic < 60 || systolic > 250 || diastolic < 40 || diastolic > 150) {
      setError('Please enter valid BP values (systolic 60–250, diastolic 40–150).')
      return
    }
    if (!form.reading_date) {
      setError('Please select a reading date.')
      return
    }

    setSubmitting(true)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Not authenticated.')
      setSubmitting(false)
      return
    }

    const { data, error: dbError } = await supabase
      .from('pharmacist_verified_readings')
      .insert({
        patient_id: patientId,
        pharmacist_id: user.id,
        reading_date: form.reading_date,
        systolic,
        diastolic,
      })
      .select('*')
      .single()

    setSubmitting(false)

    if (dbError) {
      setError(dbError.message)
      return
    }

    setConfirmed(true)
    setForm(INITIAL_FORM)
    onSave(data as PharmacistVerifiedReading)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="font-display-semi text-sectionTitle text-dialogue-text">
        Record In-Store Reading
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-dialogue-text font-body text-sm">Systolic</Label>
          <Input
            type="number"
            min={60}
            max={250}
            value={form.systolic}
            onChange={(e) => updateField('systolic', e.target.value)}
            placeholder="e.g. 130"
            className="bg-dialogue-bg border-dialogue-border text-dialogue-text"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-dialogue-text font-body text-sm">Diastolic</Label>
          <Input
            type="number"
            min={40}
            max={150}
            value={form.diastolic}
            onChange={(e) => updateField('diastolic', e.target.value)}
            placeholder="e.g. 80"
            className="bg-dialogue-bg border-dialogue-border text-dialogue-text"
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-dialogue-text font-body text-sm">Reading date</Label>
        <Input
          type="date"
          value={form.reading_date}
          onChange={(e) => updateField('reading_date', e.target.value)}
          className="bg-dialogue-bg border-dialogue-border text-dialogue-text"
          required
        />
      </div>

      {error && <p className="text-red-400 text-sm font-body">{error}</p>}

      <Button
        type="submit"
        disabled={submitting}
        className="bg-dialogue-accent hover:bg-dialogue-accent/90 text-white font-cta text-cta rounded-button disabled:opacity-50"
      >
        {submitting ? 'Saving…' : 'Save reading'}
      </Button>

      {confirmed && (
        <p className="text-teal-400 text-sm font-body">Reading saved successfully.</p>
      )}
    </form>
  )
}
