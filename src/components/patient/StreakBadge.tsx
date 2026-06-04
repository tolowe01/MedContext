interface StreakBadgeProps {
  streak: number
}

export default function StreakBadge({ streak }: StreakBadgeProps) {
  function getChipStyle(): string {
    if (streak >= 7) {
      return 'bg-dialogue-accent text-white'
    }
    if (streak >= 3) {
      return 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
    }
    return 'bg-dialogue-chip text-dialogue-textMuted border border-dialogue-border'
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
      className={`rounded-chip px-3 py-1 inline-flex items-center gap-1 font-body text-sm transition-colors ${getChipStyle()}`}
    >
      {streak >= 7 && <span aria-hidden>✓</span>}
      {streak >= 3 && streak < 7 && <span aria-hidden>↑</span>}
      {getLabel()}
    </span>
  )
}
