import type { DailyLog, PharmacistVerifiedReading } from '@/lib/types'

interface ComparisonViewProps {
  patientLog: DailyLog | null
  pharmacistReading: PharmacistVerifiedReading | null
}

function formatDelta(delta: number): string {
  return delta >= 0 ? `+${delta} mmHg` : `${delta} mmHg`
}

export default function ComparisonView({ patientLog, pharmacistReading }: ComparisonViewProps) {
  if (!patientLog && !pharmacistReading) return null

  const systolicDelta =
    patientLog && pharmacistReading
      ? pharmacistReading.systolic - patientLog.systolic
      : null
  const diastolicDelta =
    patientLog && pharmacistReading
      ? pharmacistReading.diastolic - patientLog.diastolic
      : null

  const hasSignificantVariance = systolicDelta != null && Math.abs(systolicDelta) > 10

  return (
    <div className="space-y-3">
      <h3 className="font-display-semi text-sectionTitle text-mc-neutral-900">Reading Comparison</h3>

      <div className="flex flex-col sm:flex-row gap-3">
        {patientLog ? (
          <div className="flex-1 bg-mc-surface-white rounded-card p-3">
            <p className="text-mc-neutral-400 text-xs font-body mb-1">Patient self-report</p>
            <p className="text-mc-neutral-900 font-body-bold text-cta">
              {patientLog.systolic}/{patientLog.diastolic} mmHg
            </p>
            <p className="text-mc-neutral-400 text-xs font-body mt-0.5">{patientLog.log_date}</p>
          </div>
        ) : (
          <div className="flex-1 bg-mc-surface-white rounded-card p-3 opacity-40">
            <p className="text-mc-neutral-400 text-xs font-body">No patient log</p>
          </div>
        )}

        {pharmacistReading ? (
          <div className="flex-1 bg-mc-surface-white rounded-card p-3">
            <p className="text-mc-neutral-400 text-xs font-body mb-1">Pharmacist in-store</p>
            <p className="text-mc-neutral-900 font-body-bold text-cta">
              {pharmacistReading.systolic}/{pharmacistReading.diastolic} mmHg
            </p>
            <p className="text-mc-neutral-400 text-xs font-body mt-0.5">
              {pharmacistReading.reading_date}
            </p>
          </div>
        ) : (
          <div className="flex-1 bg-mc-surface-white rounded-card p-3 opacity-40">
            <p className="text-mc-neutral-400 text-xs font-body">No in-store reading</p>
          </div>
        )}
      </div>

      {systolicDelta != null && diastolicDelta != null && (
        <div className="bg-mc-neutral-100 rounded-button px-3 py-2">
          <p className="text-mc-neutral-400 text-xs font-body">
            Delta — Systolic:{' '}
            <span className="text-mc-neutral-900 font-body-bold">
              {formatDelta(systolicDelta)}
            </span>
            {' · '}
            Diastolic:{' '}
            <span className="text-mc-neutral-900 font-body-bold">
              {formatDelta(diastolicDelta)}
            </span>
          </p>
        </div>
      )}

      {hasSignificantVariance && (
        <div className="bg-mc-warning-50 border border-mc-warning-100 rounded-button px-3 py-2">
          <p className="text-mc-warning-800 text-sm font-body">
            Significant variance — consider follow-up
          </p>
        </div>
      )}
    </div>
  )
}
