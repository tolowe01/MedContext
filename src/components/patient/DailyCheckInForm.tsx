'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertTriangle, CheckCircle2, Phone } from 'lucide-react'
import { getSideEffectsForMeds, type SideEffectSeverity } from '@/lib/side-effects'
import { checkInSchema } from '@/lib/checkin-schema'
import { submitCheckIn } from '@/actions/submit-checkin'
import StreakBadge from '@/components/patient/StreakBadge'
import CriticalReadingModal from '@/components/patient/CriticalReadingModal'

interface DailyCheckInFormProps {
  pharmacyPhone: string
  medNames: string[]
}

interface SideEffectEntry {
  checked: boolean
  severity?: SideEffectSeverity
  text?: string
}

type FieldErrors = Record<string, string>

const MAX_NOTE = 200

const SEVERITY_OPTIONS: { value: SideEffectSeverity; label: string }[] = [
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
]

function localTime(): string {
  return format(new Date(), 'HH:mm')
}

export default function DailyCheckInForm({ pharmacyPhone, medNames }: DailyCheckInFormProps) {
  const router = useRouter()
  const sideEffectOptions = useMemo(() => getSideEffectsForMeds(medNames), [medNames])

  const [systolic, setSystolic] = useState('')
  const [diastolic, setDiastolic] = useState('')
  const [heartRate, setHeartRate] = useState('')
  const [timeOfReading, setTimeOfReading] = useState<string>(localTime)
  const [adherenceTaken, setAdherenceTaken] = useState<boolean | null>(null)
  const [skipReason, setSkipReason] = useState('')
  const [sideEffects, setSideEffects] = useState<Record<string, SideEffectEntry>>({})

  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [isCritical, setIsCritical] = useState(false)
  const [alreadyLogged, setAlreadyLogged] = useState(false)

  function toggleSideEffect(code: string, checked: boolean) {
    setSideEffects((prev) => ({
      ...prev,
      [code]: { ...(prev[code] ?? {}), checked },
    }))
  }

  function setSeverity(code: string, severity: SideEffectSeverity) {
    setSideEffects((prev) => ({
      ...prev,
      [code]: { ...(prev[code] ?? { checked: true }), checked: true, severity },
    }))
  }

  function setOtherText(code: string, text: string) {
    setSideEffects((prev) => ({
      ...prev,
      [code]: { ...(prev[code] ?? { checked: true }), checked: true, text },
    }))
  }

  function selectedSideEffects() {
    return Object.entries(sideEffects)
      .filter(([, entry]) => entry.checked)
      .map(([code, entry]) => ({
        code,
        text: entry.text,
        severity: entry.severity,
      }))
  }

  function buildPayload(selected: ReturnType<typeof selectedSideEffects>) {
    return {
      systolic,
      diastolic,
      heartRate,
      timeOfReading,
      adherenceTaken: adherenceTaken === true,
      skipReason: skipReason.trim() ? skipReason : undefined,
      sideEffects: adherenceTaken === true ? selected : [],
    }
  }

  async function handleSubmit() {
    if (isSubmitting) return
    setFormError(null)
    setAlreadyLogged(false)

    if (adherenceTaken === null) {
      setFormError('Please tell us whether you took your medication today.')
      return
    }

    const selected = selectedSideEffects()
    const parsed = checkInSchema.safeParse(buildPayload(selected))
    if (!parsed.success) {
      const next: FieldErrors = {}
      for (const issue of parsed.error.issues) {
        // Re-key side-effect field errors by code so the message renders on the
        // right row regardless of selection order.
        if (issue.path[0] === 'sideEffects' && typeof issue.path[1] === 'number') {
          const code = selected[issue.path[1]]?.code
          const field = issue.path[2]
          if (code && field) {
            const key = `sideEffect.${code}.${String(field)}`
            if (!next[key]) next[key] = issue.message
            continue
          }
        }
        const key = issue.path.join('.')
        if (!next[key]) next[key] = issue.message
      }
      setErrors(next)
      setFormError('Please check the highlighted entries.')
      return
    }

    setErrors({})
    setIsSubmitting(true)
    try {
      const result = await submitCheckIn(parsed.data)
      if (result.ok) {
        if (result.isCritical) {
          setIsCritical(true)
          return
        }
        setIsComplete(true)
        router.refresh()
        return
      }

      if (result.code === 'already_logged') {
        setAlreadyLogged(true)
        return
      }
      setFormError(result.message)
    } catch {
      setFormError('Something went wrong while saving. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isCritical) {
    return <CriticalReadingModal pharmacyPhone={pharmacyPhone} />
  }

  if (isComplete) {
    return (
      <div className="bg-ln-surface1 border border-ln-hairline rounded-ln-xl p-8 flex flex-col items-center text-center gap-4">
        <CheckCircle2 className="w-14 h-14 text-ln-primary" aria-hidden="true" />
        <h2 className="font-ln-display font-semibold text-sectionTitle text-ln-ink">
          Your check-in is saved
        </h2>
        <p className="font-ln-text text-body text-ln-inkMuted leading-relaxed">
          Thank you for checking in today. See you tomorrow.
        </p>
        <StreakBadge streak={1} />
      </div>
    )
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void handleSubmit()
      }}
      className="flex flex-col gap-6"
      noValidate
    >
      <fieldset className="bg-ln-surface1 border border-ln-hairline rounded-ln-lg p-5 flex flex-col gap-4">
        <legend className="font-ln-text font-semibold text-cta text-ln-inkMuted uppercase tracking-wide">
          Your reading
        </legend>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="systolic">Systolic</Label>
            <Input
              id="systolic"
              type="number"
              inputMode="numeric"
              min={70}
              max={260}
              required
              value={systolic}
              onChange={(e) => setSystolic(e.target.value)}
              placeholder="120"
              aria-invalid={Boolean(errors.systolic)}
            />
            {errors.systolic && (
              <p className="font-ln-text text-sm text-emergency">{errors.systolic}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="diastolic">Diastolic</Label>
            <Input
              id="diastolic"
              type="number"
              inputMode="numeric"
              min={40}
              max={180}
              required
              value={diastolic}
              onChange={(e) => setDiastolic(e.target.value)}
              placeholder="80"
              aria-invalid={Boolean(errors.diastolic)}
            />
            {errors.diastolic && (
              <p className="font-ln-text text-sm text-emergency">{errors.diastolic}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="heartRate">Heart rate</Label>
            <Input
              id="heartRate"
              type="number"
              inputMode="numeric"
              min={30}
              max={220}
              required
              value={heartRate}
              onChange={(e) => setHeartRate(e.target.value)}
              placeholder="70"
              aria-invalid={Boolean(errors.heartRate)}
            />
            {errors.heartRate && (
              <p className="font-ln-text text-sm text-emergency">{errors.heartRate}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="timeOfReading">Time of reading</Label>
            <Input
              id="timeOfReading"
              type="time"
              required
              value={timeOfReading}
              onChange={(e) => setTimeOfReading(e.target.value)}
              aria-invalid={Boolean(errors.timeOfReading)}
            />
            {errors.timeOfReading && (
              <p className="font-ln-text text-sm text-emergency">{errors.timeOfReading}</p>
            )}
          </div>
        </div>
      </fieldset>

      <fieldset className="bg-ln-surface1 border border-ln-hairline rounded-ln-lg p-5 flex flex-col gap-4">
        <legend className="font-ln-text font-semibold text-cta text-ln-inkMuted uppercase tracking-wide">
          Did you take your medication today?
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant={adherenceTaken === true ? 'default' : 'outline'}
            onClick={() => setAdherenceTaken(true)}
            aria-pressed={adherenceTaken === true}
          >
            Yes
          </Button>
          <Button
            type="button"
            variant={adherenceTaken === false ? 'default' : 'outline'}
            onClick={() => setAdherenceTaken(false)}
            aria-pressed={adherenceTaken === false}
          >
            No
          </Button>
        </div>
      </fieldset>

      {adherenceTaken === true && (
        <fieldset className="bg-ln-surface1 border border-ln-hairline rounded-ln-lg p-5 flex flex-col gap-4">
          <legend className="font-ln-text font-semibold text-cta text-ln-inkMuted uppercase tracking-wide">
            Did you notice any of these? (optional)
          </legend>

          <div className="flex flex-col gap-4">
            {sideEffectOptions.map((option) => {
              const entry = sideEffects[option.code]
              const checked = Boolean(entry?.checked)
              return (
                <div key={option.code} className="flex flex-col gap-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) =>
                        toggleSideEffect(option.code, value === true)
                      }
                    />
                    <span className="font-ln-text text-body text-ln-ink">{option.label}</span>
                  </label>

                  {checked && option.code !== 'other' && option.allowsSeverity && (
                    <div className="pl-8">
                      <Select
                        value={entry?.severity ?? ''}
                        onValueChange={(value) =>
                          setSeverity(option.code, value as SideEffectSeverity)
                        }
                      >
                        <SelectTrigger aria-label={`Severity for ${option.label}`}>
                          <SelectValue placeholder="How much did it bother you? (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {SEVERITY_OPTIONS.map((severity) => (
                            <SelectItem key={severity.value} value={severity.value}>
                              {severity.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {checked && option.code === 'other' && (
                    <div className="pl-8 flex flex-col gap-1">
                      <Textarea
                        value={entry?.text ?? ''}
                        onChange={(e) => setOtherText(option.code, e.target.value)}
                        maxLength={MAX_NOTE}
                        placeholder="Describe what you noticed"
                        aria-invalid={Boolean(errors[`sideEffect.${option.code}.text`])}
                      />
                      {errors[`sideEffect.${option.code}.text`] && (
                        <p className="font-ln-text text-sm text-emergency">
                          {errors[`sideEffect.${option.code}.text`]}
                        </p>
                      )}
                      <span className="font-ln-text text-xs text-ln-inkMuted self-end">
                        {(entry?.text ?? '').length}/{MAX_NOTE}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div
            role="note"
            className="border-2 border-emergency/60 bg-emergency/10 rounded-ln-lg p-4 flex flex-col gap-2"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-emergency shrink-0" aria-hidden="true" />
              <p className="font-ln-text font-semibold text-body text-ln-ink">
                If you have any of these, get help now
              </p>
            </div>
            <ul className="font-ln-text text-body text-ln-ink leading-relaxed list-disc pl-5 flex flex-col gap-1">
              <li>Swelling of your lips, tongue, or throat, or trouble breathing or swallowing</li>
              <li>Chest pain</li>
              <li>Weakness on one side of your body or trouble speaking</li>
            </ul>
            <a
              href="tel:911"
              className="inline-flex items-center gap-2 self-start rounded-ln-md bg-emergency px-5 py-3 font-ln-text font-semibold text-cta uppercase tracking-wide text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ln-surface1"
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              Call 911
            </a>
          </div>
        </fieldset>
      )}

      {adherenceTaken === false && (
        <fieldset className="bg-ln-surface1 border border-ln-hairline rounded-ln-lg p-5 flex flex-col gap-2">
          <legend className="font-ln-text font-semibold text-cta text-ln-inkMuted uppercase tracking-wide">
            Anything you want to add? (optional)
          </legend>
          <Textarea
            value={skipReason}
            onChange={(e) => setSkipReason(e.target.value)}
            maxLength={MAX_NOTE}
            placeholder="For example, you ran out, or it was a busy day"
          />
          <span className="font-ln-text text-xs text-ln-inkMuted self-end">
            {skipReason.length}/{MAX_NOTE}
          </span>
        </fieldset>
      )}

      {alreadyLogged && (
        <p
          role="status"
          className="font-ln-text text-body text-ln-inkMuted bg-ln-surface2/10 border border-ln-hairline rounded-ln-lg p-4"
        >
          You have already checked in today. See you tomorrow.
        </p>
      )}

      {formError && (
        <p role="alert" className="font-ln-text text-body text-emergency">
          {formError}
        </p>
      )}

      <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Saving…' : 'Submit check-in'}
      </Button>
    </form>
  )
}
