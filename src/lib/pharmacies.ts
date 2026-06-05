/**
 * Pharmacies in the system.
 *
 * NOTE: there is no `pharmacies` table yet, so this list is the source of
 * truth. The first entry intentionally reuses the UUID seeded by
 * src/lib/seed.ts (PHARMACY_ID), so a patient enrolled against it is visible to
 * the seeded `pharmacist@demo` account via the `pharmacist_pharmacy_patients`
 * RLS policy.
 *
 * Patients no longer pick a pharmacy at signup: a pharmacist adds the patient
 * (creating a unique per-patient access code), and the code carries the
 * pharmacy. This list is only used to render a pharmacy's display name.
 */
export interface Pharmacy {
  id: string
  name: string
}

export const PHARMACIES: Pharmacy[] = [
  { id: '00000000-0000-0000-0000-000000000001', name: 'MedX Pharmacy — Montréal (Centre-ville)' },
  { id: '00000000-0000-0000-0000-000000000002', name: 'MedX Pharmacy — Québec (Sainte-Foy)' },
  { id: '00000000-0000-0000-0000-000000000003', name: 'MedX Pharmacy — Laval' },
]

export function isValidPharmacyId(id: string): boolean {
  return PHARMACIES.some((p) => p.id === id)
}

export function findPharmacyById(id: string | null | undefined): Pharmacy | undefined {
  if (!id) return undefined
  return PHARMACIES.find((p) => p.id === id)
}
