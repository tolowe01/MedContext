/**
 * Pharmacies a patient can associate with at signup.
 *
 * NOTE: there is no `pharmacies` table yet, so this list is the source of
 * truth. The first entry intentionally reuses the UUID seeded by
 * src/lib/seed.ts (PHARMACY_ID), so a patient who registers against it is
 * immediately visible to the seeded `pharmacist@demo` account via the existing
 * `pharmacist_pharmacy_patients` RLS policy.
 *
 * Each pharmacy has an `enrollmentCode`: the access code a pharmacist gives a
 * patient. Entering it gates the create-account form and links the new patient
 * to that pharmacy (so there is no pharmacy picker in signup).
 *
 * When the team is ready, swap this for a real `pharmacies` table in a shared
 * migration and populate from the database instead.
 */
export interface Pharmacy {
  id: string
  name: string
  enrollmentCode: string
}

export const PHARMACIES: Pharmacy[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'MedContext Pharmacy — Montréal (Centre-ville)',
    enrollmentCode: 'MCMTL1',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'MedContext Pharmacy — Québec (Sainte-Foy)',
    enrollmentCode: 'MCQC1',
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'MedContext Pharmacy — Laval',
    enrollmentCode: 'MCLAV1',
  },
]

export function isValidPharmacyId(id: string): boolean {
  return PHARMACIES.some((p) => p.id === id)
}

/** Resolve a pharmacy from a patient enrollment code (case-insensitive). */
export function findPharmacyByCode(code: string): Pharmacy | undefined {
  const normalized = code.trim().toUpperCase()
  if (!normalized) return undefined
  return PHARMACIES.find((p) => p.enrollmentCode.toUpperCase() === normalized)
}
