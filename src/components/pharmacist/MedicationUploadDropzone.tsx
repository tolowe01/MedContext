'use client'

import { useRef, useState } from 'react'
import { UploadCloud } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import type { ExtractedMed } from '@/lib/types'

interface ExtractedPayload {
  medicationListId: string
  medications: ExtractedMed[]
  raw: string
}

interface MedicationUploadDropzoneProps {
  pharmacyId: string
  patientId: string
  onExtracted: (payload: ExtractedPayload) => void
}

type Phase = 'idle' | 'uploading' | 'extracting'

const MAX_FILE_BYTES = 10 * 1024 * 1024
const STORAGE_BUCKET = 'medication-lists'

interface ExtractResponse {
  medications?: ExtractedMed[]
  raw?: string
  error?: string
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Unexpected error'
}

function validateFile(file: File): string | null {
  if (file.type !== 'application/pdf') {
    return 'Please upload a PDF file.'
  }
  if (file.size > MAX_FILE_BYTES) {
    return 'File is larger than 10MB. Please upload a smaller PDF.'
  }
  return null
}

export default function MedicationUploadDropzone({
  pharmacyId,
  patientId,
  onExtracted,
}: MedicationUploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const busy = phase !== 'idle'

  async function processFile(file: File) {
    setError(null)

    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setPhase('uploading')
    const supabase = createClient()

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${pharmacyId}/${patientId}/${Date.now()}-${safeName}`

    try {
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file, { contentType: 'application/pdf', upsert: false })
      if (uploadError) {
        setError(getErrorMessage(uploadError))
        setPhase('idle')
        return
      }

      const { data: listRow, error: insertError } = await supabase
        .from('medication_lists')
        .insert({
          patient_id: patientId,
          source_filename: file.name,
          source_storage_path: storagePath,
          status: 'extracted',
        })
        .select('id')
        .single()

      if (insertError || !listRow) {
        setError(insertError ? getErrorMessage(insertError) : 'Could not save the upload record.')
        setPhase('idle')
        return
      }

      setPhase('extracting')

      const response = await fetch('/api/extract-medications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medication_list_id: listRow.id,
          storage_path: storagePath,
        }),
      })

      if (!response.ok) {
        setError('Extraction failed. You can still add medications manually on the next step.')
        onExtracted({ medicationListId: listRow.id, medications: [], raw: '' })
        setPhase('idle')
        return
      }

      const payload = (await response.json()) as ExtractResponse
      onExtracted({
        medicationListId: listRow.id,
        medications: payload.medications ?? [],
        raw: payload.raw ?? '',
      })
      setPhase('idle')
    } catch (caught: unknown) {
      setError(getErrorMessage(caught))
      setPhase('idle')
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragActive(false)
    if (busy) return
    const file = e.dataTransfer.files?.[0]
    if (file) void processFile(file)
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    if (!busy) setDragActive(true)
  }

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void processFile(file)
    e.target.value = ''
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display font-semibold text-sectionTitle text-mc-neutral-900">
        Upload medication list
      </h2>

      <div
        onDragOver={handleDragOver}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`rounded-card border-2 border-dashed p-8 flex flex-col items-center text-center transition-colors ${
          dragActive
            ? 'border-mc-primary-400 bg-mc-surface-white'
            : 'border-mc-neutral-200 bg-mc-surface-page'
        }`}
      >
        <UploadCloud className="h-10 w-10 text-mc-primary-400 mb-3" />
        <p className="font-body text-body text-mc-neutral-900 mb-1">
          Drag and drop a PDF here
        </p>
        <p className="font-body text-sm text-mc-neutral-600 mb-4">
          PDF only, up to 10MB
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {phase === 'uploading'
            ? 'Uploading...'
            : phase === 'extracting'
              ? 'Reading document...'
              : 'Choose file'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="sr-only"
          onChange={handleSelect}
          aria-label="Upload medication list PDF"
        />
      </div>

      {phase === 'extracting' && (
        <p className="font-body text-sm text-mc-neutral-600 animate-pulse">
          Reading the document and extracting medications...
        </p>
      )}

      {error && <p className="text-emergency text-sm font-body">{error}</p>}
    </div>
  )
}
