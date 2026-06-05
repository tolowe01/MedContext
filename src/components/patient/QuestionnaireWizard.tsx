'use client'

import { useMemo, useState } from 'react'
import {
  QUESTIONNAIRE_STEPS,
  buildHealthPayload,
  weightChangeSlider,
  kgToLb,
  lbToKg,
  ftInToCm,
  cmToFtIn,
  type QuestionnaireStep,
  type WizardAnswers,
  type WeightUnit,
  type HeightUnit,
} from '@/lib/questionnaire-schema'
import type { QuestionnaireHealth, Sexe } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Check, Pencil } from 'lucide-react'

interface QuestionnaireWizardProps {
  sexe: Sexe
  onComplete: (health: QuestionnaireHealth) => Promise<{ error?: string } | void> | void
}

const INITIAL_ANSWERS: WizardAnswers = {
  weight_change: 0,
  weight_unit: 'kg',
  height_unit: 'cm',
  weight_change_unit: 'kg',
  height_in: '',
}

const isEmptyValue = (v: unknown): boolean => v === undefined || v === ''

export default function QuestionnaireWizard({ sexe, onComplete }: QuestionnaireWizardProps) {
  const [answers, setAnswers] = useState<WizardAnswers>(INITIAL_ANSWERS)
  const [currentId, setCurrentId] = useState<QuestionnaireStep['id']>(QUESTIONNAIRE_STEPS[0].id)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [editingFromReview, setEditingFromReview] = useState(false)

  const visibleSteps = useMemo(
    () => QUESTIONNAIRE_STEPS.filter((s) => !s.visible || s.visible(answers, sexe)),
    [answers, sexe]
  )

  const currentIndex = visibleSteps.findIndex((s) => s.id === currentId)
  const step = visibleSteps[currentIndex] ?? visibleSteps[0]
  const progress = reviewing
    ? 100
    : Math.round(((currentIndex + 1) / (visibleSteps.length + 1)) * 100)

  function stepsFor(next: WizardAnswers): QuestionnaireStep[] {
    return QUESTIONNAIRE_STEPS.filter((s) => !s.visible || s.visible(next, sexe))
  }

  async function finish(finalAnswers: WizardAnswers) {
    setIsSubmitting(true)
    try {
      const result = await onComplete(buildHealthPayload(finalAnswers, sexe))
      if (result && 'error' in result && result.error) {
        setError(result.error)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  function advanceFrom(fromId: QuestionnaireStep['id'], next: WizardAnswers) {
    const steps = stepsFor(next)
    const idx = steps.findIndex((s) => s.id === fromId)
    const nextStep = steps[idx + 1]

    if (editingFromReview) {
      // Only walk into a newly revealed, still-empty follow-up; otherwise back to review.
      if (nextStep && isEmptyValue(next[nextStep.id])) {
        setError(null)
        setCurrentId(nextStep.id)
        return
      }
      setEditingFromReview(false)
      setError(null)
      setReviewing(true)
      return
    }

    if (nextStep) {
      setError(null)
      setCurrentId(nextStep.id)
    } else {
      setError(null)
      setReviewing(true)
    }
  }

  function handleYesNo(value: boolean) {
    const next = { ...answers, [step.id]: value }
    setAnswers(next)
    advanceFrom(step.id, next)
  }

  function validateCurrent(): string | null {
    switch (step.kind) {
      case 'weight': {
        const raw = answers.weight
        if (isEmptyValue(raw)) return 'Please enter your weight.'
        const n = Number(raw)
        if (!Number.isFinite(n)) return 'Please enter a number.'
        const kg = answers.weight_unit === 'lb' ? lbToKg(n) : n
        if (step.min !== undefined && kg < step.min) return 'That weight seems too low.'
        if (step.max !== undefined && kg > step.max) return 'That weight seems too high.'
        return null
      }
      case 'height': {
        if (answers.height_unit === 'ft') {
          const ft = Number(answers.height_ft)
          if (isEmptyValue(answers.height_ft) || !Number.isFinite(ft))
            return 'Please enter your height.'
          const inch = Number(answers.height_in)
          const cm = ftInToCm(ft, Number.isFinite(inch) ? inch : 0)
          if (step.min !== undefined && cm < step.min) return 'That height seems too low.'
          if (step.max !== undefined && cm > step.max) return 'That height seems too high.'
          return null
        }
        const raw = answers.height
        if (isEmptyValue(raw)) return 'Please enter your height.'
        const n = Number(raw)
        if (!Number.isFinite(n)) return 'Please enter a number.'
        if (step.min !== undefined && n < step.min) return 'That height seems too low.'
        if (step.max !== undefined && n > step.max) return 'That height seems too high.'
        return null
      }
      case 'weight_change':
        return null
      case 'number': {
        const value = answers[step.id]
        if (value === undefined || value === '') return 'Please enter a value.'
        const num = Number(value)
        if (!Number.isFinite(num)) return 'Please enter a number.'
        if (step.min !== undefined && num < step.min) return `Must be at least ${step.min}.`
        if (step.max !== undefined && num > step.max) return `Must be ${step.max} or less.`
        return null
      }
      case 'text':
        if (!step.optional && !String(answers[step.id] ?? '').trim()) return 'Please fill this in.'
        return null
      case 'date':
        if (!answers[step.id]) return 'Please choose a date.'
        return null
      default:
        return null
    }
  }

  function handleContinue() {
    const validationError = validateCurrent()
    if (validationError) {
      setError(validationError)
      return
    }
    advanceFrom(step.id, answers)
  }

  function handleBack() {
    setError(null)
    if (currentIndex <= 0) return
    setCurrentId(visibleSteps[currentIndex - 1].id)
  }

  function setField(value: WizardAnswers[keyof WizardAnswers]) {
    setAnswers((prev) => ({ ...prev, [step.id]: value }))
  }

  function setWeightUnit(unit: WeightUnit) {
    setAnswers((prev) => {
      if ((prev.weight_unit ?? 'kg') === unit) return prev
      const n = Number(prev.weight)
      const converted =
        prev.weight && Number.isFinite(n)
          ? String(Math.round((unit === 'lb' ? kgToLb(n) : lbToKg(n)) * 10) / 10)
          : prev.weight
      return { ...prev, weight_unit: unit, weight: converted }
    })
  }

  function setHeightUnit(unit: HeightUnit) {
    setAnswers((prev) => {
      if ((prev.height_unit ?? 'cm') === unit) return prev
      if (unit === 'ft') {
        const n = Number(prev.height)
        if (prev.height && Number.isFinite(n)) {
          const { ft, inch } = cmToFtIn(n)
          return { ...prev, height_unit: 'ft', height_ft: String(ft), height_in: String(inch) }
        }
        return { ...prev, height_unit: 'ft' }
      }
      const ft = Number(prev.height_ft)
      const inch = Number(prev.height_in)
      if (prev.height_ft && Number.isFinite(ft)) {
        const cm = Math.round(ftInToCm(ft, Number.isFinite(inch) ? inch : 0))
        return { ...prev, height_unit: 'cm', height: String(cm) }
      }
      return { ...prev, height_unit: 'cm' }
    })
  }

  function setWeightChangeUnit(unit: WeightUnit) {
    setAnswers((prev) => {
      if ((prev.weight_change_unit ?? 'kg') === unit) return prev
      const v = prev.weight_change ?? 0
      const converted = unit === 'lb' ? kgToLb(v) : lbToKg(v)
      const cfg = weightChangeSlider(unit)
      const stepped = Math.max(
        cfg.min,
        Math.min(cfg.max, Math.round(converted / cfg.step) * cfg.step)
      )
      return { ...prev, weight_change_unit: unit, weight_change: stepped }
    })
  }

  function editStep(id: QuestionnaireStep['id']) {
    setEditingFromReview(true)
    setReviewing(false)
    setError(null)
    setCurrentId(id)
  }

  // ----- Review screen -----
  if (reviewing) {
    const rows = stepsFor(answers)
    return (
      <div className="bg-mc-surface-white border border-mc-neutral-200 rounded-cardLarge p-6">
        <h2 className="font-display-semi text-screenTitle text-mc-neutral-900 mb-1 leading-tight">
          Review your answers
        </h2>
        <p className="font-body text-body text-mc-neutral-400 mb-6">
          Check everything looks right. You can edit any answer before you submit.
        </p>

        <ul className="divide-y divide-mc-neutral-200 border-y border-mc-neutral-200">
          {rows.map((s) => (
            <li key={s.id} className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="font-body text-sm text-mc-neutral-400">{s.question}</p>
                <p className="font-body text-body text-mc-neutral-900 break-words">
                  {formatAnswer(s, answers)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => editStep(s.id)}
                disabled={isSubmitting}
                className="shrink-0 inline-flex items-center gap-1 font-body text-sm text-mc-primary-400 hover:text-mc-primary-600 transition-colors disabled:opacity-50"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
            </li>
          ))}
        </ul>

        {error && <p className="text-mc-danger-600 text-sm font-body mt-4">{error}</p>}

        <Button
          onClick={() => finish(answers)}
          disabled={isSubmitting}
          className="w-full py-4 mt-6 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving…' : 'Submit'}
        </Button>
        <button
          type="button"
          onClick={() => {
            setReviewing(false)
            setCurrentId(visibleSteps[visibleSteps.length - 1].id)
          }}
          disabled={isSubmitting}
          className="mt-5 font-body text-body text-mc-neutral-400 hover:text-mc-neutral-900 transition-colors disabled:opacity-50"
        >
          Back
        </button>
      </div>
    )
  }

  const weightUnit = answers.weight_unit ?? 'kg'
  const heightUnit = answers.height_unit ?? 'cm'
  const wcUnit = answers.weight_change_unit ?? 'kg'
  const wcSlider = weightChangeSlider(wcUnit)

  return (
    <div className="bg-mc-surface-white border border-mc-neutral-200 rounded-cardLarge p-6">
      {/* Progress */}
      <div className="flex items-center justify-between mb-2">
        <p className="font-body text-sm text-mc-neutral-400">Health questionnaire</p>
        <p className="font-body text-sm text-mc-neutral-400">{progress}%</p>
      </div>
      <div className="h-1.5 w-full rounded-full bg-mc-neutral-200 overflow-hidden mb-8">
        <div
          className="h-full bg-mc-primary-400 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question */}
      <h2 className="font-display-semi text-screenTitle text-mc-neutral-900 mb-2 leading-tight">
        {step.question}
      </h2>
      {step.helper && <p className="font-body text-body text-mc-neutral-400 mb-6">{step.helper}</p>}
      {!step.helper && <div className="mb-6" />}

      <div className="space-y-3">
        {step.kind === 'yesno' && (
          <>
            <OptionCard label="Yes" selected={answers[step.id] === true} onClick={() => handleYesNo(true)} />
            <OptionCard label="No" selected={answers[step.id] === false} onClick={() => handleYesNo(false)} />
          </>
        )}

        {step.kind === 'weight' && (
          <div className="space-y-3">
            <UnitToggle
              options={[
                { v: 'kg', l: 'kg' },
                { v: 'lb', l: 'lb' },
              ]}
              value={weightUnit}
              onChange={(u) => setWeightUnit(u)}
            />
            <NumberWithUnit
              autoFocus
              placeholder={step.placeholder}
              unit={weightUnit}
              value={answers.weight ?? ''}
              onChange={(v) => setField(v)}
              onEnter={handleContinue}
            />
          </div>
        )}

        {step.kind === 'height' && (
          <div className="space-y-3">
            <UnitToggle
              options={[
                { v: 'cm', l: 'cm' },
                { v: 'ft', l: 'ft / in' },
              ]}
              value={heightUnit}
              onChange={(u) => setHeightUnit(u)}
            />
            {heightUnit === 'ft' ? (
              <div className="flex gap-3">
                <NumberWithUnit
                  autoFocus
                  placeholder="5"
                  unit="ft"
                  value={answers.height_ft ?? ''}
                  onChange={(v) => setAnswers((p) => ({ ...p, height_ft: v }))}
                  onEnter={handleContinue}
                />
                <NumberWithUnit
                  placeholder="8"
                  unit="in"
                  value={answers.height_in ?? ''}
                  onChange={(v) => setAnswers((p) => ({ ...p, height_in: v }))}
                  onEnter={handleContinue}
                />
              </div>
            ) : (
              <NumberWithUnit
                autoFocus
                placeholder={step.placeholder}
                unit="cm"
                value={answers.height ?? ''}
                onChange={(v) => setField(v)}
                onEnter={handleContinue}
              />
            )}
          </div>
        )}

        {step.kind === 'weight_change' && (
          <div className="space-y-3">
            <UnitToggle
              options={[
                { v: 'kg', l: 'kg' },
                { v: 'lb', l: 'lb' },
              ]}
              value={wcUnit}
              onChange={(u) => setWeightChangeUnit(u)}
            />
            <div className="bg-mc-surface-page border border-mc-neutral-200 rounded-card p-5">
              <p className="text-center font-display-semi text-sectionTitle text-mc-neutral-900 mb-4">
                {sliderLabel(answers.weight_change ?? 0, wcSlider.unit)}
              </p>
              <Slider
                value={answers.weight_change ?? 0}
                onChange={(v) => setField(v)}
                min={wcSlider.min}
                max={wcSlider.max}
                step={wcSlider.step}
                aria-label={step.question}
              />
              <div className="flex justify-between mt-2 font-body text-xs text-mc-neutral-400">
                <span>{wcSlider.minLabel}</span>
                <span>{wcSlider.midLabel}</span>
                <span>{wcSlider.maxLabel}</span>
              </div>
            </div>
          </div>
        )}

        {step.kind === 'text' && (
          <Textarea
            autoFocus
            rows={3}
            placeholder={step.placeholder ?? 'Type here…'}
            value={(answers[step.id] as string) ?? ''}
            onChange={(e) => setField(e.target.value)}
            className="bg-mc-surface-page border-mc-neutral-200 text-mc-neutral-900 placeholder:text-mc-neutral-400 focus:border-mc-primary-400 resize-none"
          />
        )}

        {step.kind === 'date' && (
          <Input
            type="date"
            autoFocus
            value={(answers[step.id] as string) ?? ''}
            onChange={(e) => setField(e.target.value)}
            className="text-body"
          />
        )}

        {step.kind === 'number' && (
          <NumberWithUnit
            autoFocus
            placeholder={step.placeholder}
            unit={step.unit}
            value={(answers[step.id] as string) ?? ''}
            onChange={(v) => setField(v)}
            onEnter={handleContinue}
          />
        )}
      </div>

      {error && <p className="text-mc-danger-600 text-sm font-body mt-3">{error}</p>}

      {step.kind !== 'yesno' && (
        <Button onClick={handleContinue} disabled={isSubmitting} className="w-full py-4 mt-6 disabled:opacity-50">
          {isSubmitting
            ? 'Saving…'
            : editingFromReview
              ? 'Save'
              : currentIndex === visibleSteps.length - 1
                ? 'Review answers'
                : 'Continue'}
        </Button>
      )}

      {(currentIndex > 0 || editingFromReview) && (
        <button
          type="button"
          onClick={
            editingFromReview
              ? () => {
                  setEditingFromReview(false)
                  setError(null)
                  setReviewing(true)
                }
              : handleBack
          }
          disabled={isSubmitting}
          className="mt-5 font-body text-body text-mc-neutral-400 hover:text-mc-neutral-900 transition-colors disabled:opacity-50"
        >
          {editingFromReview ? 'Back to review' : 'Back'}
        </button>
      )}
    </div>
  )
}

function formatAnswer(step: QuestionnaireStep, a: WizardAnswers): string {
  switch (step.kind) {
    case 'yesno':
      return a[step.id] === true ? 'Yes' : a[step.id] === false ? 'No' : '—'
    case 'weight':
      return a.weight ? `${a.weight} ${a.weight_unit ?? 'kg'}` : '—'
    case 'height':
      return a.height_unit === 'ft'
        ? a.height_ft
          ? `${a.height_ft} ft ${a.height_in || 0} in`
          : '—'
        : a.height
          ? `${a.height} cm`
          : '—'
    case 'weight_change':
      return sliderLabel(a.weight_change ?? 0, a.weight_change_unit ?? 'kg')
    case 'text':
      return String(a[step.id] ?? '').trim() || '—'
    case 'date':
      return (a[step.id] as string) || '—'
    default:
      return String(a[step.id] ?? '—')
  }
}

interface NumberWithUnitProps {
  value: string
  onChange: (value: string) => void
  unit?: string
  placeholder?: string
  autoFocus?: boolean
  onEnter?: () => void
}

function NumberWithUnit({ value, onChange, unit, placeholder, autoFocus, onEnter }: NumberWithUnitProps) {
  return (
    <div className="relative flex-1">
      <Input
        type="number"
        inputMode="decimal"
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
        className="pr-14 text-body bg-mc-surface-page border-mc-neutral-200 text-mc-neutral-900 placeholder:text-mc-neutral-400 focus:border-mc-primary-400"
      />
      {unit && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-body text-body text-mc-neutral-400">
          {unit}
        </span>
      )}
    </div>
  )
}

interface UnitToggleProps<T extends string> {
  options: { v: T; l: string }[]
  value: T
  onChange: (value: T) => void
}

function UnitToggle<T extends string>({ options, value, onChange }: UnitToggleProps<T>) {
  return (
    <div className="inline-flex rounded-button border border-mc-neutral-200 bg-mc-surface-page p-0.5">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`px-3 py-1.5 rounded-chip text-sm font-body transition-colors ${
            value === o.v
              ? 'bg-mc-primary-400 text-white'
              : 'text-mc-neutral-600 hover:text-mc-neutral-900'
          }`}
        >
          {o.l}
        </button>
      ))}
    </div>
  )
}

function OptionCard({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-card border px-5 py-4 text-left transition-colors ${
        selected
          ? 'border-mc-primary-400 bg-mc-primary-400/10'
          : 'border-mc-neutral-200 bg-mc-surface-page hover:border-mc-primary-400/60'
      }`}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          selected ? 'border-mc-primary-400 bg-mc-primary-400' : 'border-mc-neutral-200'
        }`}
      >
        {selected && <Check className="h-4 w-4 text-white" />}
      </span>
      <span className="font-body text-body text-mc-neutral-900">{label}</span>
    </button>
  )
}

function sliderLabel(value: number, unit: string): string {
  if (value === 0) return 'No change'
  const magnitude = Math.abs(value)
  const direction = value > 0 ? 'gained' : 'lost'
  return `${magnitude} ${unit} ${direction}`
}
