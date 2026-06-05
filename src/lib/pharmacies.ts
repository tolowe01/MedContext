/**
 * Pharmacies a patient can associate with at signup.
 *
 * NOTE: there is no `pharmacies` table yet, so this list is the source of
 * truth for the signup dropdown. The first entry intentionally reuses the
 * UUID seeded by src/lib/seed.ts (PHARMACY_ID), so a patient who registers
 * against it is immediately visible to the seeded `pharmacist@demo` account
 * via the existing `pharmacist_pharmacy_patients` RLS policy.
 *
 * When the team is ready, swap this for a real `pharmacies` table in a shared
 * migration and populate the dropdown from the database instead.
 */
export interface Pharmacy {
  id: string
  name: string
}

export const PHARMACIES: Pharmacy[] = [
  { id: '00000000-0000-0000-0000-000000000001', name: 'MedContext Pharmacy — Montréal (Centre-ville)' },
  { id: '00000000-0000-0000-0000-000000000002', name: 'MedContext Pharmacy — Québec (Sainte-Foy)' },
  { id: '00000000-0000-0000-0000-000000000003', name: 'MedContext Pharmacy — Laval' },
]

export function isValidPharmacyId(id: string): boolean {
  return PHARMACIES.some((p) => p.id === id)
}
