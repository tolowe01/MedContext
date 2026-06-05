import { Check } from 'lucide-react'

interface StreakBadgeProps {
  streak: number
}

export default function StreakBadge({ streak }: StreakBadgeProps) {
  function getChipStyle(): string {
    if (streak >= 7) {
      return 'bg-mc-teal-400 text-white'
    }
    if (streak >= 3) {
      return 'bg-mc-teal-50 text-mc-teal-800 border border-mc-teal-100'
    }
    return 'bg-mc-neutral-100 text-mc-neutral-600 border border-mc-neutral-200'
  }

  function getLabel(): string {
    if (streak >= 7) {
      return 'Week complete'
    }
    if (streak >= 3) {
      return `Steady — ${streak} days`
    }
    return `Day ${streak}`
  }

  return (
    <span
      className={`rounded-chip px-3 py-1 inline-flex items-center gap-1.5 font-body text-sm transition-colors ${getChipStyle()}`}
    >
      {streak >= 7 && <Check className="w-3.5 h-3.5 stroke-[3] animate-check-pop" aria-hidden />}
      {streak >= 3 && streak < 7 && <span aria-hidden>↑</span>}
      {getLabel()}
    </span>
  )
}
