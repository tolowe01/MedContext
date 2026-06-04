import { describe, it, expect } from 'vitest'
import {
  questionnaireSchema,
  QUESTIONNAIRE_SCHEMA_VERSION,
} from '@/lib/questionnaire-schema'

describe('questionnaireSchema', () => {
  it('has 8 fields', () => {
    expect(questionnaireSchema).toHaveLength(8)
  })

  it('every field has an id and a label', () => {
    for (const field of questionnaireSchema) {
      expect(field.id).toBeTruthy()
      expect(field.label).toBeTruthy()
    }
  })

  it('has no duplicate field ids', () => {
    const ids = questionnaireSchema.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every textarea field has kind textarea', () => {
    const textareas = questionnaireSchema.filter((f) => f.kind === 'textarea')
    for (const field of textareas) {
      expect(field.kind).toBe('textarea')
      expect('options' in field).toBe(false)
    }
  })

  it('every select field has an options array with at least 2 items', () => {
    const selects = questionnaireSchema.filter((f) => f.kind === 'select')
    expect(selects.length).toBeGreaterThan(0)
    for (const field of selects) {
      expect('options' in field).toBe(true)
      if ('options' in field) {
        expect(field.options.length).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('schema version is v1.0', () => {
    expect(QUESTIONNAIRE_SCHEMA_VERSION).toBe('v1.0')
  })
})
