'use server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { redirect } from 'next/navigation'
import { SYNTHESIS_SYSTEM_PROMPT } from '@/prompts/synthesis-system'
import { subDays, format } from 'date-fns'
import type { DailyLog } from '@/lib/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function buildSynthesisPrompt(logs: DailyLog[]): string {
  const lines = logs.map(
    (l) =>
      `${l.log_date}: ${l.systolic}/${l.diastolic} mmHg, heart rate: ${l.heart_rate ?? 'not recorded'}, ` +
      `medication taken: ${l.adherence_taken ? 'yes' : 'no'}` +
      (l.symptom_note ? `, symptoms: "${l.symptom_note}"` : '')
  )
  return `Patient logs for the past 7 days:\n${lines.join('\n')}`
}

export async function submitWeek() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: patient } = await supabase
    .from('patients')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (!patient) return { error: 'Patient not found' }

  const weekStart = format(subDays(new Date(), 6), 'yyyy-MM-dd')

  const { data: logs } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('patient_id', patient.id)
    .gte('log_date', weekStart)
    .order('log_date', { ascending: true })

  if (!logs || logs.length === 0) return { error: 'No logs to submit' }

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: SYNTHESIS_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildSynthesisPrompt(logs as DailyLog[]) }],
  })

  const synthesis =
    message.content[0].type === 'text' ? message.content[0].text : ''

  const { data: submission, error } = await supabase
    .from('weekly_submissions')
    .insert({
      patient_id: patient.id,
      week_start: weekStart,
      ai_synthesis_text: synthesis,
      status: 'submitted',
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  redirect(`/review?submissionId=${submission.id}`)
}
