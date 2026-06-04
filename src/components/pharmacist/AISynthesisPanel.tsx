'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface AISynthesisPanelProps {
  submissionId: string
  initialText: string | null
  editedText: string | null
}

export default function AISynthesisPanel({
  submissionId,
  initialText,
  editedText,
}: AISynthesisPanelProps) {
  const [text, setText] = useState(editedText ?? initialText ?? '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const isEdited = text !== (initialText ?? '')

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    setSaved(false)

    const supabase = createClient()
    const { error } = await supabase
      .from('weekly_submissions')
      .update({ ai_synthesis_edited_text: text })
      .eq('id', submissionId)

    setSaving(false)
    if (error) {
      setSaveError(error.message)
    } else {
      setSaved(true)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="font-display-semi text-sectionTitle text-dialogue-text">
          AI Summary <span className="font-body text-sm text-dialogue-textMuted">(editable)</span>
        </h3>
        <div className="relative group">
          <span className="text-dialogue-textMuted text-sm cursor-help select-none" aria-label="Info">
            ⓘ
          </span>
          <div className="absolute left-6 top-0 z-10 hidden group-hover:block bg-dialogue-surface border border-dialogue-border rounded-button px-3 py-2 text-xs text-dialogue-textMuted w-56 shadow-lg">
            The pharmacist&apos;s own notes take precedence
          </div>
        </div>
        {isEdited && (
          <Badge className="bg-dialogue-chip text-dialogue-accent text-xs font-body-bold">
            Edited
          </Badge>
        )}
      </div>

      <Textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setSaved(false)
        }}
        rows={6}
        className="bg-dialogue-bg border-dialogue-border text-dialogue-text font-body text-body resize-none focus:border-dialogue-accent"
        placeholder="AI synthesis will appear here…"
      />

      {saveError && (
        <p className="text-red-400 text-sm font-body">{saveError}</p>
      )}

      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-dialogue-accent hover:bg-dialogue-accent/90 text-white font-cta text-cta rounded-button disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save edits'}
        </Button>
        {saved && (
          <span className="text-teal-400 text-sm font-body">Saved</span>
        )}
      </div>
    </div>
  )
}
