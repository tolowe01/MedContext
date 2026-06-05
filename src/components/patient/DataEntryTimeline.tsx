import { DailyLog } from '@/lib/types'
import { format, addDays, parseISO } from 'date-fns'
import { Check } from 'lucide-react'

interface DataEntryTimelineProps {
  logs: DailyLog[]
  totalDays?: number
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function DataEntryTimeline({ logs, totalDays = 7 }: DataEntryTimelineProps) {
  const loggedDates = new Set(logs.map((l) => l.log_date))

  // Anchor the strip on the FIRST logged day so day 1 sits on the left,
  // whatever weekday it is. Each circle is still labeled with its real weekday.
  const sortedDates = logs.map((l) => l.log_date).sort()
  const startStr = sortedDates[0] ?? format(new Date(), 'yyyy-MM-dd')
  const start = parseISO(startStr)

  const days = Array.from({ length: totalDays }, (_, i) => {
    const date = addDays(start, i)
    const dateStr = format(date, 'yyyy-MM-dd')
    return {
      dateStr,
      dayLabel: DAY_LABELS[date.getDay()],
      hasLog: loggedDates.has(dateStr),
    }
  })

  return (
    <div className="flex items-center justify-between gap-1">
      {days.map((day) => (
        <div key={day.dateStr} className="flex flex-col items-center gap-1.5">
          <div
            role="img"
            aria-label={`${day.dateStr}: ${day.hasLog ? 'logged' : 'no log'}`}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
              day.hasLog
                ? 'bg-mc-teal-400 text-white scale-100'
                : 'bg-transparent border-2 border-mc-neutral-300 scale-95'
            }`}
          >
            {day.hasLog && (
              <Check className="w-4 h-4 stroke-[3.5] animate-check-pop" />
            )}
          </div>
          <span className="text-xs font-body text-mc-neutral-600">{day.dayLabel}</span>
        </div>
      ))}
    </div>
  )
}
