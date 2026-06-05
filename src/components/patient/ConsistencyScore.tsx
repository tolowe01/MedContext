import { DailyLog } from '@/lib/types'

interface ConsistencyScoreProps {
  logs: DailyLog[]
  totalDays?: number
}

export default function ConsistencyScore({ logs, totalDays = 7 }: ConsistencyScoreProps) {
  const percentage = totalDays > 0 ? Math.round((logs.length / totalDays) * 100) : 0

  return (
    <div className="flex flex-col items-center py-2">
      <p
        className="font-display-bold text-screenTitle text-mc-neutral-900 leading-none mb-1"
        aria-label={`Consistency score: ${percentage}%`}
      >
        {percentage}%
      </p>
      <p className="font-body text-body text-mc-neutral-400 mb-2">Consistency</p>
      <p className="text-xs font-body text-mc-neutral-400 text-center">
        Reflects how often you log, not your health
      </p>
    </div>
  )
}
