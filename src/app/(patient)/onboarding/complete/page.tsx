'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import LottiePharmacist from '@/components/patient/LottiePharmacist'

export default function OnboardingCompletePage() {
  const router = useRouter()

  async function handleContinue() {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
    router.push('/tracking')
  }

  return (
    <main className="min-h-screen bg-mc-surface-page px-screenX pt-screenTop pb-20 flex flex-col items-center justify-center text-center">
      <LottiePharmacist loop className="w-48 h-48 mx-auto mb-6" />

      <h1 className="font-display-bold text-screenTitle text-mc-neutral-900 mb-4">
        Hi, I&apos;m your pharmacist&apos;s assistant.
      </h1>

      <p className="font-body text-body text-mc-neutral-400 max-w-sm leading-relaxed mb-10">
        Each evening I&apos;ll ask you for a blood pressure reading and whether you took your
        medication. You can type or speak. Your data is reviewed by a real licensed pharmacist.
      </p>

      <Button
        onClick={handleContinue}
        className="w-full max-w-xs bg-mc-primary-400 hover:bg-mc-primary-600 text-white font-cta text-cta rounded-button py-4 transition-opacity"
      >
        Get started
      </Button>
    </main>
  )
}
