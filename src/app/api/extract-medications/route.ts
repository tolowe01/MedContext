import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { anthropic, MODEL } from '@/lib/anthropic'
import {
  MEDICATION_EXTRACTION_SYSTEM_PROMPT,
  EXTRACT_MEDICATIONS_TOOL,
} from '@/prompts/medication-extraction'
import { extractMedicationsInputSchema } from '@/lib/medication-comparison'
import type { ExtractedMed } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_FILE_BYTES = 10 * 1024 * 1024
const STORAGE_BUCKET = 'medication-lists'

const requestSchema = z.object({
  medication_list_id: z.string().min(1),
  storage_path: z.string().min(1),
})

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Unexpected error'
}

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const { medication_list_id, storage_path } = parsed.data

  // Authenticate and authorize the caller as a pharmacist.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'pharmacist') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Download the document with the service-role client (private bucket).
  const service = serviceClient()
  const { data: blob, error: downloadError } = await service.storage
    .from(STORAGE_BUCKET)
    .download(storage_path)

  if (downloadError || !blob) {
    return NextResponse.json({ error: 'Could not download document' }, { status: 502 })
  }

  if (blob.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'File exceeds 10MB limit' }, { status: 413 })
  }

  const base64 = Buffer.from(await blob.arrayBuffer()).toString('base64')

  // Extraction stage: any failure here returns 200 with an empty list so the
  // pharmacist can fall back to manual entry instead of seeing an error page.
  let medications: ExtractedMed[] = []
  let rawInput: unknown = {}
  let extractionError: string | null = null

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: MEDICATION_EXTRACTION_SYSTEM_PROMPT,
      tools: [EXTRACT_MEDICATIONS_TOOL],
      tool_choice: { type: 'tool', name: 'extract_medications' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64 },
            },
            {
              type: 'text',
              text: 'Extract the current active medication list from this document.',
            },
          ],
        },
      ],
    })

    const toolBlock = message.content.find(
      (block) => block.type === 'tool_use' && block.name === 'extract_medications'
    )
    rawInput = toolBlock && toolBlock.type === 'tool_use' ? toolBlock.input : {}

    const validated = extractMedicationsInputSchema.safeParse(rawInput)
    medications = validated.success
      ? validated.data.medications.map((med) => ({ ...med }))
      : []
  } catch (error: unknown) {
    extractionError = getErrorMessage(error)
    rawInput = { error: extractionError }
  }

  // Persist the raw extraction text and advance status (best effort).
  await service
    .from('medication_lists')
    .update({
      extraction_raw_text: JSON.stringify(rawInput ?? {}, null, 2),
      status: 'extracted',
    })
    .eq('id', medication_list_id)

  const raw = JSON.stringify(rawInput ?? {}, null, 2)

  if (extractionError) {
    return NextResponse.json({ medications: [], raw, error: extractionError }, { status: 200 })
  }

  return NextResponse.json({ medications, raw }, { status: 200 })
}
