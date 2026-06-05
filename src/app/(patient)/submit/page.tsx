'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { submitWeek } from '@/actions/submit-week'
import { DailyLog } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { format, parseISO } from 'date-fns'

export default function SubmitPage() {
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLogs() {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setIsLoadingLogs(false)
        return
      }

      const { data: patient } = await supabase
        .from('patients')
        .select('id')
        .eq('profile_id', user.id)
        .maybeSingle()

      if (!patient) {
        setIsLoadingLogs(false)
        return
      }

      const { data, error: fetchError } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('patient_id', patient.id)
        .order('log_date', { ascending: false })
        .limit(7)

      if (!fetchError && data) {
        setLogs(data as DailyLog[])
      }
      setIsLoadingLogs(false)
    }

    fetchLogs()
  }, [])

  async function handleSubmit() {
    setIsSubmitting(true)
    setError(null)
    try {
      // submitWeek redirects to /review on success; only returns on error.
      const result = await submitWeek()
      if (result?.error) {
        setError(result.error)
        setIsSubmitting(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setIsSubmitting(false)
    }
  }

  function formatDate(dateStr: string) {
    try {
      return format(parseISO(dateStr), 'EEE, MMM d')
    } catch {
      return dateStr
    }
  }

  if (isLoadingLogs) {
    return (
      <main className="min-h-screen bg-mc-surface-page px-screenX pt-screenTop pb-20 flex items-center justify-center">
        <p className="font-body text-body text-mc-neutral-400 animate-pulse">
          Loading your readings…
        </p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-mc-surface-page px-screenX pt-screenTop pb-20">
      <h1 className="font-display-bold text-screenTitle text-mc-neutral-900 mb-2">
        Submit your week
      </h1>
      <p className="font-body text-body text-mc-neutral-400 mb-6">
        Review your readings before sending them to your pharmacist.
      </p>

      <div className="bg-mc-surface-white border border-mc-neutral-200 rounded-card overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-mc-neutral-200">
          <p className="font-body-bold text-cta text-mc-neutral-400 uppercase tracking-wide">
            7-day summary
          </p>
        </div>

        {logs.length === 0 ? (
          <div className="px-5 py-6 text-center">
            <p className="font-body text-body text-mc-neutral-400">No readings found.</p>
          </div>
        ) : (
          <div className="divide-y divide-mc-neutral-200">
            <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-2 px-5 py-2 bg-mc-surface-page/50">
              <p className="text-xs sm:text-sm font-body text-mc-neutral-400">Date</p>
              <p className="text-xs sm:text-sm font-body text-mc-neutral-400 text-center">SBP</p>
              <p className="text-xs sm:text-sm font-body text-mc-neutral-400 text-center">DBP</p>
              <p className="text-xs sm:text-sm font-body text-mc-neutral-400 text-center">Taken</p>
            </div>
            {logs.map((log) => (
              <div key={log.id} className="grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-2 px-5 py-3 items-center">
                <p className="font-body text-sm text-mc-neutral-900">{formatDate(log.log_date)}</p>
                <p className="font-body text-sm text-mc-neutral-900 text-center">{log.systolic}</p>
                <p className="font-body text-sm text-mc-neutral-900 text-center">{log.diastolic}</p>
                <p className="font-body text-sm text-center">
                  {log.adherence_taken ? (
                    <span className="text-mc-teal-600">Yes</span>
                  ) : (
                    <span className="text-mc-danger-600">No</span>
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-mc-danger-50 border border-mc-danger-100 rounded-button px-4 py-3 mb-4">
          <p className="text-mc-danger-800 text-sm font-body">{error}</p>
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || logs.length === 0}
        className="w-full bg-mc-primary-400 hover:bg-mc-primary-600 text-white font-cta text-cta rounded-button py-4 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Submitting…
          </span>
        ) : (
          'Submit to pharmacist'
        )}
      </Button>
    </main>
  )
}
