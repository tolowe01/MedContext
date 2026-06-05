import { randomInt } from 'crypto'

/**
 * Alphabet for patient access codes. Omits ambiguous characters (0, O, 1, I)
 * so codes are easy to read aloud and type at the pharmacy counter.
 */
export const ACCESS_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

const ACCESS_CODE_LENGTH = 6

/**
 * Generate a 6 character access code using a cryptographically secure source.
 * Uses crypto.randomInt to avoid modulo bias over the alphabet.
 */
export function generateAccessCode(): string {
  const chars = Array.from({ length: ACCESS_CODE_LENGTH }, () =>
    ACCESS_CODE_ALPHABET.charAt(randomInt(0, ACCESS_CODE_ALPHABET.length))
  )
  return chars.join('')
}
