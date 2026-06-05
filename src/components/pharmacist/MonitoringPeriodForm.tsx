'use client'

import { useState } from 'react'
import { addDays, format } from 'date-fns'
import { createMonitoringPeriod } from '@/actions/medication-lists'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface MonitoringPeriodFormProps {
  patientId: string
  medicationListId: string
  onCreated: () => void
}

interface FormState {
  start_date: string
  expected_end_date: string
  preferred_log_time: string
}

const DEFAULT_LOG_TIME = '19:00'

function defaultForm(): FormState {
  const today = new Date()
  return {
    start_date: format(today, 'yyyy-MM-dd'),
    expected_end_date: format(addDays(today, 7), 'yyyy-MM-dd'),
    preferred_log_time: DEFAULT_LOG_TIME,
  }
}

export default function MonitoringPeriodForm({
  patientId,
  medicationListId,
  onCreated,
}: MonitoringPeriodFormProps) {
  const [form, setForm] = useState<FormState>(() => defaultForm())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.start_date || !form.expected_end_date || !form.preferred_log_time) {
      setError('Please complete all fields.')
      return
    }
    if (form.expected_end_date < form.start_date) {
      setError('The end date must be on or after the start date.')
      return
    }

    setSubmitting(true)
    const result = await createMonitoringPeriod({
      patient_id: patientId,
      medication_list_id: medicationListId,
      start_date: form.start_date,
      expected_end_date: form.expected_end_date,
      preferred_log_time: form.preferred_log_time,
    })
    setSubmitting(false)

    if ('error' in result) {
      setError(result.error)
      return
    }
    onCreated()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="font-ln-display font-semibold text-sectionTitle text-ln-ink">
        Set up monitoring period
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="start_date">Start date</Label>
          <Input
            id="start_date"
            type="date"
            value={form.start_date}
            onChange={(e) => updateField('start_date', e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="expected_end_date">Expected end date</Label>
          <Input
            id="expected_end_date"
            type="date"
            value={form.expected_end_date}
            onChange={(e) => updateField('expected_end_date', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="preferred_log_time">Preferred daily log time</Label>
        <Input
          id="preferred_log_time"
          type="time"
          value={form.preferred_log_time}
          onChange={(e) => updateField('preferred_log_time', e.target.value)}
          required
        />
      </div>

      {error && <p className="text-emergency text-sm font-ln-text">{error}</p>}

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? 'Creating...' : 'Start monitoring'}
      </Button>
    </form>
  )
}
