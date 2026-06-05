import { z } from 'zod'
import type { ExtractedMed } from '@/lib/types'

const DOSE_UNIT_PATTERN = /\b\d+(\.\d+)?\s*(mg|mcg|ml|g|units?|ui)\b/gi
const COMBINING_MARKS_PATTERN = /[̀-ͯ]/g
const NON_LETTER_PATTERN = /[^a-z\s]/g
const WHITESPACE_PATTERN = /\s+/g

/**
 * Normalize a medication name for comparison: lowercase, strip accents, remove
 * dose and unit tokens, drop non-letters, and collapse whitespace. Two names
 * that refer to the same drug should normalize to the same string.
 */
export function normalizeName(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(COMBINING_MARKS_PATTERN, '')
    .replace(DOSE_UNIT_PATTERN, ' ')
    .replace(NON_LETTER_PATTERN, ' ')
    .replace(WHITESPACE_PATTERN, ' ')
    .trim()
}

/**
 * Return a NEW array where each medication is flagged as new when its
 * normalized name was not present in the patient's prior medication lists.
 * Does not mutate the input array or its elements.
 */
export function markNewMedications(
  extracted: ExtractedMed[],
  priorNames: string[]
): ExtractedMed[] {
  const priorSet = new Set(priorNames.map(normalizeName).filter((name) => name.length > 0))

  return extracted.map((med) => ({
    ...med,
    is_new: !priorSet.has(normalizeName(med.name)),
  }))
}

/**
 * Validation schema for the structured medication payload returned by Claude.
 * Empty strings are allowed for every field because the model emits "" for
 * anything it cannot read from the source document.
 */
export const extractMedicationsInputSchema = z.object({
  medications: z.array(
    z.object({
      name: z.string(),
      dose: z.string(),
      frequency: z.string(),
      prescribing_physician_name: z.string(),
      notes: z.string(),
    })
  ),
})

export type ExtractMedicationsInput = z.infer<typeof extractMedicationsInputSchema>
