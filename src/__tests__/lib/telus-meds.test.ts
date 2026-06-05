import { describe, it, expect } from 'vitest'
import { SOPHIE_TELUS_MEDS } from '@/lib/telus-meds'

describe('mocked Telus medication list', () => {
  it('contains the three demo hypertension medications', () => {
    const names = SOPHIE_TELUS_MEDS.map((m) => m.name)
    expect(names).toEqual(['Amlodipine', 'Hydrochlorothiazide', 'Ramipril'])
  })

  it('every entry has name, dose, frequency, and timing', () => {
    for (const med of SOPHIE_TELUS_MEDS) {
      expect(med.name).toBeTruthy()
      expect(med.dose).toMatch(/mg/)
      expect(med.frequency).toBeTruthy()
      expect(['morning', 'evening', 'night', 'afternoon']).toContain(med.timing)
    }
  })
})
