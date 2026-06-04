export interface TelusMedication {
  name: string
  dose: string
  frequency: string
  timing: string
}

export const SOPHIE_TELUS_MEDS: TelusMedication[] = [
  { name: 'Amlodipine', dose: '5 mg', frequency: 'once daily', timing: 'morning' },
  { name: 'Hydrochlorothiazide', dose: '12.5 mg', frequency: 'once daily', timing: 'morning' },
  { name: 'Ramipril', dose: '10 mg', frequency: 'once daily', timing: 'evening' },
]
