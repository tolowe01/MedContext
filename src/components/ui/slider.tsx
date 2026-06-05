'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SliderProps {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  className?: string
  'aria-label'?: string
}

/**
 * Lightweight range slider styled to the MedContext theme.
 * Uses a native <input type="range"> so it adds no dependency.
 */
export function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
  className,
  ...props
}: SliderProps) {
  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      className={cn(
        'w-full h-2 rounded-full appearance-none cursor-pointer bg-mc-neutral-200 accent-mc-primary-400',
        className
      )}
      {...props}
    />
  )
}
