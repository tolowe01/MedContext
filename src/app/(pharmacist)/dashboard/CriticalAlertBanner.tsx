'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Volume2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { acknowledgeAlert } from '@/actions/monitoring'
import type { CriticalAlert } from '@/lib/types'
import { Button } from '@/components/ui/button'
import CriticalAlertSound, { type CriticalAlertSoundHandle } from './CriticalAlertSound'

interface CriticalAlertBannerProps {
  pharmacistId: string
  initialAlerts: CriticalAlert[]
}

function fireDesktopNotification(alert: CriticalAlert): void {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  if (!document.hidden && document.hasFocus()) return
  try {
    new Notification(`CRITICAL READING from ${alert.patient_name ?? 'patient'}`, {
      body: `${alert.systolic}/${alert.diastolic} mmHg`,
      requireInteraction: true,
      icon: '/icon-192.png',
    })
  } catch {
    // Notification construction can throw on some platforms, ignore
  }
}

export default function CriticalAlertBanner({
  pharmacistId,
  initialAlerts,
}: CriticalAlertBannerProps) {
  const router = useRouter()
  const supabase = createClient()
  const soundRef = useRef<CriticalAlertSoundHandle | null>(null)
  const [alerts, setAlerts] = useState<CriticalAlert[]>(initialAlerts)
  const [audioArmed, setAudioArmed] = useState(false)

  const armAudio = useCallback(() => {
    soundRef.current?.arm()
    setAudioArmed(true)
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {
        // Permission request can reject, ignore
      })
    }
  }, [])

  // Fallback: arm audio on the first document pointerdown (one-time).
  useEffect(() => {
    function handlePointerDown() {
      armAudio()
    }
    document.addEventListener('pointerdown', handlePointerDown, { once: true })
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [armAudio])

  const onNew = useCallback(
    (alert: CriticalAlert) => {
      setAlerts((prev) => {
        if (prev.some((a) => a.id === alert.id)) return prev
        return [alert, ...prev]
      })
      soundRef.current?.play()
      fireDesktopNotification(alert)
      router.refresh()
    },
    [router]
  )

  useEffect(() => {
    const channel = supabase
      .channel('critical-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'critical_alerts',
          filter: `pharmacist_id=eq.${pharmacistId}`,
        },
        (payload) => {
          onNew(payload.new as CriticalAlert)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [pharmacistId, supabase, onNew])

  const handleAcknowledge = useCallback(
    async (alertId: string) => {
      const result = await acknowledgeAlert(alertId)
      if ('error' in result) {
        // Surface the failure without removing the alert so the pharmacist retries.
        window.alert(`Could not acknowledge alert: ${result.error}`)
        return
      }
      setAlerts((prev) => prev.filter((a) => a.id !== alertId))
      router.refresh()
    },
    [router]
  )

  const current = alerts[0]
  const extraCount = alerts.length - 1

  return (
    <>
      <CriticalAlertSound ref={soundRef} />

      {current && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed top-0 inset-x-0 z-50 bg-emergency text-white shadow-lg"
        >
          <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-4">
            <button
              type="button"
              onClick={() =>
                router.push(`/patient/${current.patient_id}?highlight=${current.daily_log_id}`)
              }
              className="flex flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-emergency rounded-ln-md"
            >
              <AlertTriangle className="h-6 w-6 shrink-0" aria-hidden="true" />
              <span className="font-ln-text font-semibold text-body">
                CRITICAL READING: {current.patient_name ?? 'Patient'} {current.systolic}/
                {current.diastolic}
                {extraCount > 0 && (
                  <span className="ml-2 font-ln-text opacity-90">+{extraCount} more</span>
                )}
              </span>
            </button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAcknowledge(current.id)}
              className="shrink-0 border-white text-white hover:bg-white hover:text-emergency"
            >
              Acknowledge
            </Button>
          </div>
        </div>
      )}

      {!audioArmed && (
        <button
          type="button"
          onClick={armAudio}
          className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-ln-sm bg-ln-surface1 border border-ln-hairline px-3 py-2 text-xs font-ln-text font-semibold text-ln-ink hover:bg-ln-hairline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ln-primary focus-visible:ring-offset-2 focus-visible:ring-offset-ln-canvas"
        >
          <Volume2 className="h-4 w-4" aria-hidden="true" />
          Enable alert sound
        </button>
      )}
    </>
  )
}
