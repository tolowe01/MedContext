'use client'

import { useMemo, useState } from 'react'
import {
  QUESTIONNAIRE_STEPS,
  buildHealthPayload,
  type QuestionnaireStep,
  type WizardAnswers,
} from '@/lib/questionnaire-schema'
import type { QuestionnaireHealth, Sexe } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Check } from 'lucide-react'

interface QuestionnaireWizardProps {
  sexe: Sexe
  onComplete: (health: QuestionnaireHealth) => Promise<{ error?: string } | void> | void
}

export default function QuestionnaireWizard({ sexe, onComplete }: QuestionnaireWizardProps) {
  const [answers, setAnswers] = useState<WizardAnswers>({ weight_change: 0 })
  const [currentId, setCurrentId] = useState<QuestionnaireStep['id']>(
    QUESTIONNAIRE_STEPS[0].id
  )
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const visibleSteps = useMemo(
    () => QUESTIONNAIRE_STEPS.filter((s) => !s.visible || s.visible(answers, sexe)),
    [answers, sexe]
  )

  const currentIndex = visibleSteps.findIndex((s) => s.id === currentId)
  const step = visibleSteps[currentIndex] ?? visibleSteps[0]
  const progress = Math.round(((currentIndex + 1) / visibleSteps.length) * 100)

  function stepsFor(next: WizardAnswers): QuestionnaireStep[] {
    return QUESTIONNAIRE_STEPS.filter((s) => !s.visible || s.visible(next, sexe))
  }

  async function finish(finalAnswers: WizardAnswers) {
    setIsSubmitting(true)
    try {
      const result = await onComplete(buildHealthPayload(finalAnswers, sexe))
      // On success the parent redirects; if it returns an error, surface it.
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
    if (nextStep) {
      setError(null)
      setCurrentId(nextStep.id)
    } else {
      finish(next)
    }
  }

  function handleYesNo(value: boolean) {
    const next = { ...answers, [step.id]: value }
    setAnswers(next)
    advanceFrom(step.id, next)
  }

  function validateCurrent(): string | null {
    const value = answers[step.id]
    switch (step.kind) {
      case 'number': {
        if (value === undefined || value === '') return 'Please enter a value.'
        const num = Number(value)
        if (!Number.isFinite(num)) return 'Please enter a number.'
        if (step.min !== undefined && num < step.min) return `Must be at least ${step.min}.`
        if (step.max !== undefined && num > step.max) return `Must be ${step.max} or less.`
        return null
      }
      case 'text':
        if (!step.optional && !String(value ?? '').trim()) return 'Please fill this in.'
        return null
      case 'date':
        if (!value) return 'Please choose a date.'
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

  return (
    <div className="bg-dialogue-surface border border-dialogue-border rounded-cardLarge p-6">
      {/* Progress */}
      <div className="flex items-center justify-between mb-2">
        <p className="font-body text-sm text-dialogue-textMuted">Health questionnaire</p>
        <p className="font-body text-sm text-dialogue-textMuted">{progress}%</p>
      </div>
      <div className="h-1.5 w-full rounded-full bg-dialogue-border overflow-hidden mb-8">
        <div
          className="h-full bg-dialogue-accent rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question */}
      <h2 className="font-display-semi text-screenTitle text-dialogue-text mb-2 leading-tight">
        {step.question}
      </h2>
      {step.helper && (
        <p className="font-body text-body text-dialogue-textMuted mb-6">{step.helper}</p>
      )}
      {!step.helper && <div className="mb-6" />}

      {/* Input by kind */}
      <div className="space-y-3">
        {step.kind === 'yesno' && (
          <>
            <OptionCard
              label="Yes"
              selected={answers[step.id] === true}
              onClick={() => handleYesNo(true)}
            />
            <OptionCard
              label="No"
              selected={answers[step.id] === false}
              onClick={() => handleYesNo(false)}
            />
          </>
        )}

        {step.kind === 'number' && (
          <div className="relative">
            <Input
              type="number"
              inputMode="decimal"
              autoFocus
              placeholder={step.placeholder}
              value={(answers[step.id] as string) ?? ''}
              min={step.min}
              max={step.max}
              onChange={(e) => setField(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
              className="pr-14 text-body"
            />
            {step.unit && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-body text-body text-dialogue-textMuted">
                {step.unit}
              </span>
            )}
          </div>
        )}

        {step.kind === 'text' && (
          <Textarea
            autoFocus
            rows={3}
            placeholder={step.placeholder ?? 'Type here…'}
            value={(answers[step.id] as string) ?? ''}
            onChange={(e) => setField(e.target.value)}
            className="bg-dialogue-bg border-dialogue-border text-dialogue-text placeholder:text-dialogue-textMuted focus:border-dialogue-accent resize-none"
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

        {step.kind === 'slider' && step.slider && (
          <div className="bg-dialogue-bg border border-dialogue-border rounded-card p-5">
            <p className="text-center font-display-semi text-sectionTitle text-dialogue-text mb-4">
              {sliderLabel((answers.weight_change as number) ?? 0, step.slider.unit)}
            </p>
            <Slider
              value={(answers.weight_change as number) ?? 0}
              onChange={(v) => setField(v)}
              min={step.slider.min}
              max={step.slider.max}
              step={step.slider.step}
              aria-label={step.question}
            />
            <div className="flex justify-between mt-2 font-body text-xs text-dialogue-textMuted">
              <span>{step.slider.minLabel}</span>
              <span>{step.slider.midLabel}</span>
              <span>{step.slider.maxLabel}</span>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-red-400 text-sm font-body mt-3">{error}</p>}

      {/* Continue for non-yesno kinds */}
      {step.kind !== 'yesno' && (
        <Button
          onClick={handleContinue}
          disabled={isSubmitting}
          className="w-full py-4 mt-6 disabled:opacity-50"
        >
          {isSubmitting
            ? 'Saving…'
            : currentIndex === visibleSteps.length - 1
              ? 'Finish'
              : 'Continue'}
        </Button>
      )}

      {/* Back */}
      {currentIndex > 0 && (
        <button
          type="button"
          onClick={handleBack}
          disabled={isSubmitting}
          className="mt-5 font-body text-body text-dialogue-textMuted hover:text-dialogue-text transition-colors disabled:opacity-50"
        >
          Back
        </button>
      )}
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
          ? 'border-dialogue-accent bg-dialogue-accent/10'
          : 'border-dialogue-border bg-dialogue-bg hover:border-dialogue-accent/60'
      }`}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          selected ? 'border-dialogue-accent bg-dialogue-accent' : 'border-dialogue-border'
        }`}
      >
        {selected && <Check className="h-4 w-4 text-dialogue-bg" />}
      </span>
      <span className="font-body text-body text-dialogue-text">{label}</span>
    </button>
  )
}

function sliderLabel(value: number, unit: string): string {
  if (value === 0) return 'No change'
  const magnitude = Math.abs(value)
  const direction = value > 0 ? 'gained' : 'lost'
  return `${magnitude} ${unit} ${direction}`
}
