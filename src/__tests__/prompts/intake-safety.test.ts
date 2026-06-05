import { describe, it, expect } from 'vitest'
import { INTAKE_SYSTEM_PROMPT, LOG_READING_TOOL } from '@/prompts/intake-system'
import { SYNTHESIS_SYSTEM_PROMPT } from '@/prompts/synthesis-system'

/**
 * These guard the clinical safety contract. The pitch promises the chatbot
 * "never interprets, never evaluates" and that all decisions belong to the
 * pharmacist. If an edit removes these rails, this suite fails loudly.
 */
describe('intake system prompt safety rails', () => {
  it('forbids evaluative language', () => {
    expect(INTAKE_SYSTEM_PROMPT).toMatch(/not.*medical professional/i)
    expect(INTAKE_SYSTEM_PROMPT).toMatch(/do not interpret/i)
    expect(INTAKE_SYSTEM_PROMPT.toLowerCase()).toContain('never say')
  })

  it('includes the 911 emergency escalation for severe symptoms', () => {
    expect(INTAKE_SYSTEM_PROMPT).toMatch(/911/)
    expect(INTAKE_SYSTEM_PROMPT).toMatch(/chest pain|fainting|difficulty breathing/i)
  })

  it('requires explicit confirmation before logging', () => {
    expect(INTAKE_SYSTEM_PROMPT).toMatch(/do not log without explicit user confirmation/i)
  })
})

describe('log_reading tool schema', () => {
  it('is named log_reading', () => {
    expect(LOG_READING_TOOL.name).toBe('log_reading')
  })

  it('requires the three core clinical fields', () => {
    const required = LOG_READING_TOOL.input_schema.required ?? []
    expect(required).toContain('systolic')
    expect(required).toContain('diastolic')
    expect(required).toContain('adherence_taken')
  })

  it('keeps heart_rate and symptom_note optional', () => {
    const required = LOG_READING_TOOL.input_schema.required ?? []
    expect(required).not.toContain('heart_rate')
    expect(required).not.toContain('symptom_note')
  })

  it('declares all five extractable properties', () => {
    const props = LOG_READING_TOOL.input_schema.properties ?? {}
    expect(Object.keys(props).sort()).toEqual(
      ['adherence_taken', 'diastolic', 'heart_rate', 'symptom_note', 'systolic'].sort()
    )
  })
})

describe('synthesis system prompt', () => {
  it('forbids diagnosis and dose recommendations', () => {
    expect(SYNTHESIS_SYSTEM_PROMPT).toMatch(/do not diagnose/i)
    expect(SYNTHESIS_SYSTEM_PROMPT).toMatch(/dose change/i)
  })

  it('defers all clinical decisions to the pharmacist', () => {
    expect(SYNTHESIS_SYSTEM_PROMPT).toMatch(/pharmacist makes all clinical decisions/i)
  })
})
