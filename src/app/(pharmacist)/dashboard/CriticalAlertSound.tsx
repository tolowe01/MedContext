'use client'

import { forwardRef, useImperativeHandle, useRef } from 'react'

export interface CriticalAlertSoundHandle {
  arm: () => void
  play: () => void
}

/**
 * Plays the critical-alert tone. Prefers a bundled mp3 (unlocked via `arm()`
 * on a user gesture to satisfy autoplay policy), and falls back to a Web Audio
 * oscillator when the file is missing or playback is rejected. Never throws.
 */
const CriticalAlertSound = forwardRef<CriticalAlertSoundHandle>(function CriticalAlertSound(
  _props,
  ref
) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const isArmedRef = useRef(false)

  function playOscillatorFallback(): void {
    try {
      const ctx = new AudioContext()
      const bursts = [0, 0.32]
      for (const offset of bursts) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = 880
        const start = ctx.currentTime + offset
        gain.gain.setValueAtTime(0.12, start)
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25)
        osc.start(start)
        osc.stop(start + 0.25)
      }
    } catch {
      // AudioContext unavailable, fail silently
    }
  }

  useImperativeHandle(
    ref,
    () => ({
      arm: () => {
        const audio = audioRef.current
        if (!audio || isArmedRef.current) return
        const previousVolume = audio.volume
        audio.volume = 0
        const result = audio.play()
        if (result && typeof result.then === 'function') {
          result
            .then(() => {
              audio.pause()
              audio.currentTime = 0
              audio.volume = previousVolume
              isArmedRef.current = true
            })
            .catch(() => {
              audio.volume = previousVolume
            })
        } else {
          audio.pause()
          audio.currentTime = 0
          audio.volume = previousVolume
          isArmedRef.current = true
        }
      },
      play: () => {
        const audio = audioRef.current
        if (!audio || audio.error) {
          playOscillatorFallback()
          return
        }
        try {
          audio.currentTime = 0
          const result = audio.play()
          if (result && typeof result.then === 'function') {
            result.catch(() => {
              playOscillatorFallback()
            })
          }
        } catch {
          playOscillatorFallback()
        }
      },
    }),
    []
  )

  return (
    <audio
      ref={audioRef}
      src="/sounds/critical-alert.mp3"
      preload="auto"
      aria-hidden="true"
      className="hidden"
    />
  )
})

export default CriticalAlertSound
