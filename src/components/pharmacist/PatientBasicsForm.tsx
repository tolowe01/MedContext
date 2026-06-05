'use client'

import { useState } from 'react'
import { z } from 'zod'
import { Check, Copy, Mail } from 'lucide-react'
import { createPatientAccount } from '@/actions/patient-onboarding'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface PatientBasicsFormProps {
  onComplete: (patientId: string) => void
}

interface FormState {
  first_name: string
  last_name: string
  date_of_birth: string
  email: string
}

const INITIAL_FORM: FormState = {
  first_name: '',
  last_name: '',
  date_of_birth: '',
  email: '',
}

const labelClass = 'text-mc-neutral-600 text-sm font-body'
const inputClass =
  'bg-mc-surface-white border border-mc-neutral-200 rounded-button text-mc-neutral-900 placeholder:text-mc-neutral-400 mc-focus'

const formSchema = z.object({
  first_name: z.string().trim().min(1, 'First name is required'),
  last_name: z.string().trim().min(1, 'Last name is required'),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Please select a date of birth'),
  email: z.string().trim().email('Please enter a valid email'),
})

export default function PatientBasicsForm({ onComplete }: PatientBasicsFormProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accessCode, setAccessCode] = useState<string | null>(null)
  const [createdPatientId, setCreatedPatientId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [emailOpened, setEmailOpened] = useState(false)

  function updateField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const parsed = formSchema.safeParse(form)
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Please check the form')
      return
    }

    setSubmitting(true)
    const result = await createPatientAccount(parsed.data)
    setSubmitting(false)

    if ('error' in result) {
      setError(result.error)
      return
    }

    setAccessCode(result.access_code)
    setCreatedPatientId(result.patient_id)
  }

  async function copyCode() {
    if (!accessCode) return
    try {
      await navigator.clipboard.writeText(accessCode)
      setCopied(true)
    } catch {
      setError('Could not copy to clipboard, please copy the code manually')
    }
  }

  function emailAccessCode() {
    if (!accessCode) return
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const subject = 'Your MedX access code'
    const body =
      `Hello ${form.first_name},\r\n\r\n` +
      `Your pharmacist has set up MedX so you can track your blood pressure from home.\r\n\r\n` +
      `Create your account: ${origin}/signup\r\n` +
      `Your access code: ${accessCode}\r\n\r\n` +
      `Enter this code when you sign up, then set your own email and password.\r\n`
    const href = `mailto:${encodeURIComponent(form.email)}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`
    setEmailOpened(true)
    window.location.href = href
  }

  if (accessCode && createdPatientId) {
    return (
      <div className="space-y-5">
        <h2 className="font-display text-xl font-medium -tracking-[0.014em] text-mc-neutral-900">
          Patient added
        </h2>
        <p className="font-body text-sm text-mc-neutral-600">
          Email this access code to the patient, or copy it to share another way. They enter it when
          they create their account.
        </p>
        <div className="bg-mc-neutral-100 border border-mc-neutral-200 rounded-tile p-6 flex flex-col items-center gap-4">
          <span className="font-mono text-3xl font-medium tracking-[0.25em] text-mc-primary-400">
            {accessCode}
          </span>
          <div className="flex w-full gap-2">
            <Button
              type="button"
              onClick={emailAccessCode}
              className="flex-1 gap-2 normal-case tracking-normal rounded-button bg-mc-primary-400 text-white hover:bg-mc-primary-600 mc-focus"
            >
              {emailOpened ? <Check className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
              {emailOpened ? 'Email sent' : 'Email code to patient'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={copyCode}
              className="gap-2 normal-case tracking-normal rounded-button bg-mc-surface-white text-mc-neutral-900 border-mc-neutral-200 hover:bg-mc-neutral-100 mc-focus"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
        {error && <p className="text-emergency text-sm font-body">{error}</p>}
        <Button
          type="button"
          onClick={() => onComplete(createdPatientId)}
          className="w-full normal-case tracking-normal rounded-button bg-mc-surface-white text-mc-neutral-900 border border-mc-neutral-200 hover:bg-mc-neutral-100 mc-focus"
        >
          Continue to medication upload
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h2 className="font-display text-xl font-medium -tracking-[0.014em] text-mc-neutral-900">
        Patient basics
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="first_name" className={labelClass}>
            First name
          </Label>
          <Input
            id="first_name"
            value={form.first_name}
            onChange={(e) => updateField('first_name', e.target.value)}
            placeholder="Sophie"
            autoComplete="given-name"
            required
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="last_name" className={labelClass}>
            Last name
          </Label>
          <Input
            id="last_name"
            value={form.last_name}
            onChange={(e) => updateField('last_name', e.target.value)}
            placeholder="Tremblay"
            autoComplete="family-name"
            required
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="date_of_birth" className={labelClass}>
          Date of birth
        </Label>
        <Input
          id="date_of_birth"
          type="date"
          value={form.date_of_birth}
          onChange={(e) => updateField('date_of_birth', e.target.value)}
          required
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email" className={labelClass}>
          Email
        </Label>
        <Input
          id="email"
          type="email"
          value={form.email}
          onChange={(e) => updateField('email', e.target.value)}
          placeholder="patient@example.com"
          autoComplete="email"
          required
          className={inputClass}
        />
      </div>

      {error && <p className="text-emergency text-sm font-body">{error}</p>}

      <Button
        type="submit"
        disabled={submitting}
        className="w-full normal-case tracking-normal rounded-button bg-mc-primary-400 text-white hover:bg-mc-primary-600 mc-focus"
      >
        {submitting ? 'Creating account...' : 'Create patient account'}
      </Button>
    </form>
  )
}
