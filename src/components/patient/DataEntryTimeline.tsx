import { DailyLog } from '@/lib/types'
import { format, subDays, parseISO } from 'date-fns'

interface DataEntryTimelineProps {
  logs: DailyLog[]
  totalDays?: number
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function DataEntryTimeline({ logs, totalDays = 7 }: DataEntryTimelineProps) {
  const today = new Date()

  const days = Array.from({ length: totalDays }, (_, i) => {
    const date = subDays(today, totalDays - 1 - i)
    const dateStr = format(date, 'yyyy-MM-dd')
    const dayOfWeek = date.getDay()
    const hasLog = logs.some((log) => log.log_date === dateStr)
    return { dateStr, dayLabel: DAY_LABELS[dayOfWeek], hasLog }
  })

  return (
    <div className="flex items-center justify-between gap-1">
      {days.map((day) => (
        <div key={day.dateStr} className="flex flex-col items-center gap-1.5">
          <div
            aria-label={`${day.dateStr}: ${day.hasLog ? 'logged' : 'no log'}`}
            className={`w-8 h-8 rounded-full transition-colors ${
              day.hasLog
                ? 'bg-dialogue-accent'
                : 'bg-transparent border-2 border-dialogue-border'
            }`}
          />
          <span className="text-xs font-body text-dialogue-textMuted">{day.dayLabel}</span>
        </div>
      ))}
    </div>
  )
}
