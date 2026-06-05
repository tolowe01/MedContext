import { describe, it, expect } from 'vitest'
import { decisionView, canTransition } from '@/lib/monitoring-state'
import type { MonitoringStatus } from '@/lib/types'

describe('decisionView', () => {
  it('returns monitoring for invited', () => {
    expect(decisionView('invited', false)).toEqual({ kind: 'monitoring' })
  })

  it('returns monitoring for active', () => {
    expect(decisionView('active', false)).toEqual({ kind: 'monitoring' })
  })

  it('returns decision with no acknowledge for submitted', () => {
    expect(decisionView('submitted', false)).toEqual({
      kind: 'decision',
      showAcknowledge: false,
    })
  })

  it('ignores hasUnackedAlert for submitted (never shows acknowledge)', () => {
    expect(decisionView('submitted', true)).toEqual({
      kind: 'decision',
      showAcknowledge: false,
    })
  })

  it('returns decision with showAcknowledge true for critical_alert with an unacked alert', () => {
    expect(decisionView('critical_alert', true)).toEqual({
      kind: 'decision',
      showAcknowledge: true,
    })
  })

  it('returns decision with showAcknowledge false for critical_alert without an unacked alert', () => {
    expect(decisionView('critical_alert', false)).toEqual({
      kind: 'decision',
      showAcknowledge: false,
    })
  })

  it('returns post_consultation for consultation_scheduled', () => {
    expect(decisionView('consultation_scheduled', false)).toEqual({
      kind: 'post_consultation',
    })
  })

  it('returns summary for approved', () => {
    expect(decisionView('approved', false)).toEqual({ kind: 'summary' })
  })

  it('returns summary for monitor_extended', () => {
    expect(decisionView('monitor_extended', false)).toEqual({ kind: 'summary' })
  })

  it('returns summary for escalated', () => {
    expect(decisionView('escalated', false)).toEqual({ kind: 'summary' })
  })

  it('returns summary for consultation_completed', () => {
    expect(decisionView('consultation_completed', false)).toEqual({ kind: 'summary' })
  })
})

describe('canTransition', () => {
  it('allows a transition when the current status is in the allowed set', () => {
    expect(canTransition('submitted', ['submitted', 'critical_alert'])).toBe(true)
  })

  it('allows a transition from critical_alert when permitted', () => {
    expect(canTransition('critical_alert', ['submitted', 'critical_alert'])).toBe(true)
  })

  it('rejects a transition when the current status is not allowed', () => {
    expect(canTransition('approved', ['submitted', 'critical_alert'])).toBe(false)
  })

  it('rejects a transition against an empty allowed set', () => {
    const noneAllowed: MonitoringStatus[] = []
    expect(canTransition('submitted', noneAllowed)).toBe(false)
  })

  it('allows escalation transitions from consultation_scheduled', () => {
    expect(
      canTransition('consultation_scheduled', [
        'submitted',
        'critical_alert',
        'consultation_scheduled',
      ])
    ).toBe(true)
  })
})
