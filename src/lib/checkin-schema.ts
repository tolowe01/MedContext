import { z } from 'zod'
import { SIDE_EFFECT_CODES } from '@/lib/side-effects'

/**
 * Shared validation for the structured daily check-in. Imported by both the
 * client form (inline error display) and the server action (boundary
 * validation), so the two never drift.
 */
export const sideEffectSelectionSchema = z.object({
  code: z.enum(SIDE_EFFECT_CODES),
  text: z.string().max(200).optional(),
  severity: z.enum(['mild', 'moderate', 'severe']).optional(),
})

export type SideEffectSelection = z.infer<typeof sideEffectSelectionSchema>

export const checkInSchema = z
  .object({
    systolic: z.coerce.number().int().min(70).max(260),
    diastolic: z.coerce.number().int().min(40).max(180),
    heartRate: z.coerce.number().int().min(30).max(220),
    timeOfReading: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Enter a time as HH:mm'),
    adherenceTaken: z.boolean(),
    skipReason: z.string().max(200).optional(),
    sideEffects: z.array(sideEffectSelectionSchema).default([]),
  })
  .superRefine((value, ctx) => {
    for (let i = 0; i < value.sideEffects.length; i++) {
      const effect = value.sideEffects[i]
      if (effect.code === 'other' && !effect.text?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please describe what you noticed.',
          path: ['sideEffects', i, 'text'],
        })
      }
    }
  })

export type CheckInInput = z.infer<typeof checkInSchema>
