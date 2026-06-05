'use client'

import { useState } from 'react'
import { Plus, Trash2, RefreshCw } from 'lucide-react'
import { confirmMedications } from '@/actions/medication-lists'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import type { ExtractedMed } from '@/lib/types'

interface MedicationConfirmTableProps {
  medicationListId: string
  initialRows: ExtractedMed[]
  rawExtraction: string
  onConfirmed: () => void
  onReplace: () => void
}

type EditableField = 'name' | 'dose' | 'frequency' | 'prescribing_physician_name'

const BLANK_ROW: ExtractedMed = {
  name: '',
  dose: '',
  frequency: '',
  prescribing_physician_name: '',
  notes: '',
  is_new: false,
}

function buildInitialRows(rows: ExtractedMed[]): ExtractedMed[] {
  if (rows.length === 0) return [{ ...BLANK_ROW }]
  return rows.map((row) => ({ ...BLANK_ROW, ...row }))
}

export default function MedicationConfirmTable({
  medicationListId,
  initialRows,
  rawExtraction,
  onConfirmed,
  onReplace,
}: MedicationConfirmTableProps) {
  const [rows, setRows] = useState<ExtractedMed[]>(() => buildInitialRows(initialRows))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startedEmpty = initialRows.length === 0

  function updateRow(index: number, field: EditableField, value: string) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
    setError(null)
  }

  function addRow() {
    setRows((prev) => [...prev, { ...BLANK_ROW }])
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleConfirm() {
    setError(null)
    const filled = rows.filter((row) => row.name.trim().length > 0)
    if (filled.length === 0) {
      setError('Please add at least one medication, or replace the file and try again.')
      return
    }

    setSubmitting(true)
    const result = await confirmMedications(medicationListId, filled)
    setSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }
    onConfirmed()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-ln-display font-semibold text-sectionTitle text-ln-ink">
          Confirm medications
        </h2>
        <button
          type="button"
          onClick={onReplace}
          className="inline-flex items-center gap-1.5 font-ln-text text-sm text-ln-primary hover:underline"
        >
          <RefreshCw className="h-4 w-4" />
          Replace file and re-extract
        </button>
      </div>

      {startedEmpty && (
        <div className="bg-ln-surface1 border border-ln-hairline rounded-ln-lg px-4 py-3">
          <p className="font-ln-text text-sm text-ln-ink">
            We could not read this file automatically. Add medications manually below.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {rows.map((row, index) => (
          <div
            key={index}
            className="bg-ln-surface1 border border-ln-hairline rounded-ln-lg p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-ln-text font-medium text-sm text-ln-inkMuted">
                Medication {index + 1}
              </span>
              <div className="flex items-center gap-2">
                {row.is_new && <Badge variant="accent">New</Badge>}
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  className="text-ln-inkMuted hover:text-emergency transition-colors"
                  aria-label={`Remove medication ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`name-${index}`}>Name</Label>
                <Input
                  id={`name-${index}`}
                  value={row.name}
                  onChange={(e) => updateRow(index, 'name', e.target.value)}
                  placeholder="e.g. Amlodipine"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`dose-${index}`}>Dose</Label>
                <Input
                  id={`dose-${index}`}
                  value={row.dose}
                  onChange={(e) => updateRow(index, 'dose', e.target.value)}
                  placeholder="e.g. 5 mg"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`frequency-${index}`}>Frequency</Label>
                <Input
                  id={`frequency-${index}`}
                  value={row.frequency}
                  onChange={(e) => updateRow(index, 'frequency', e.target.value)}
                  placeholder="e.g. once daily"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`prescriber-${index}`}>Prescriber</Label>
                <Input
                  id={`prescriber-${index}`}
                  value={row.prescribing_physician_name}
                  onChange={(e) =>
                    updateRow(index, 'prescribing_physician_name', e.target.value)
                  }
                  placeholder="e.g. Dr. Chen"
                />
              </div>
            </div>

            {row.notes.trim().length > 0 && (
              <p className="font-ln-text text-sm text-ln-inkMuted italic">{row.notes}</p>
            )}
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addRow} className="gap-1.5">
        <Plus className="h-4 w-4" />
        Add medication
      </Button>

      {rawExtraction.trim().length > 0 && (
        <details className="bg-ln-surface1 border border-ln-hairline rounded-ln-lg p-4">
          <summary className="font-ln-text text-sm text-ln-inkMuted cursor-pointer">
            Show raw AI extraction
          </summary>
          <pre className="mt-3 whitespace-pre-wrap break-words font-ln-text text-xs text-ln-inkMuted">
            {rawExtraction}
          </pre>
        </details>
      )}

      {error && <p className="text-emergency text-sm font-ln-text">{error}</p>}

      <Button type="button" onClick={handleConfirm} disabled={submitting} className="w-full">
        {submitting ? 'Saving...' : 'Confirm medications'}
      </Button>
    </div>
  )
}
