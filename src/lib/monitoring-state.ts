import type { MonitoringStatus } from './types'

/**
 * What the pharmacist patient-detail page should render for a given monitoring
 * status. Pure + testable (no Supabase), driving the decision UI in §5.
 */
export type DecisionView =
  | { kind: 'monitoring' } // invited / active: patient still logging
  | { kind: 'decision'; showAcknowledge: boolean } // submitted / critical_alert
  | { kind: 'post_consultation' } // consultation_scheduled
  | { kind: 'summary' } // terminal: approved / monitor_extended / escalated

export function decisionView(
  status: MonitoringStatus,
  hasUnackedAlert: boolean
): DecisionView {
  switch (status) {
    case 'invited':
    case 'active':
      return { kind: 'monitoring' }
    case 'submitted':
      return { kind: 'decision', showAcknowledge: false }
    case 'critical_alert':
      return { kind: 'decision', showAcknowledge: hasUnackedAlert }
    case 'consultation_scheduled':
      return { kind: 'post_consultation' }
    case 'consultation_completed':
    case 'approved':
    case 'monitor_extended':
    case 'escalated':
      return { kind: 'summary' }
    default:
      return { kind: 'summary' }
  }
}

/**
 * Guard for state-machine transitions. RLS enforces ownership but NOT which
 * status changes are valid, so every mutating action must call this.
 */
export function canTransition(
  current: MonitoringStatus,
  allowedFrom: MonitoringStatus[]
): boolean {
  return allowedFrom.includes(current)
}
