'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface DashboardRealtimeListenerProps {
  pharmacyId: string
}

export default function DashboardRealtimeListener({ pharmacyId }: DashboardRealtimeListenerProps) {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-submissions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'weekly_submissions',
        },
        () => {
          // Play soft chime using Web Audio API
          try {
            const ctx = new AudioContext()
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.frequency.value = 880
            gain.gain.setValueAtTime(0.1, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
            osc.start(ctx.currentTime)
            osc.stop(ctx.currentTime + 0.5)
          } catch {
            // AudioContext unavailable — fail silently
          }
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [pharmacyId, router, supabase])

  return null
}
