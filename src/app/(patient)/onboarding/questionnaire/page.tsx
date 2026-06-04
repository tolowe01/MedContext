'use client'

import { saveQuestionnaire } from '@/actions/questionnaire'
import DynamicQuestionnaire from '@/components/patient/DynamicQuestionnaire'
import { useState } from 'react'

export default function QuestionnairePage() {
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(data: Record<string, string>) {
    setIsLoading(true)
    try {
      await saveQuestionnaire(data)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-dialogue-bg px-screenX pt-screenTop pb-20">
      <h1 className="font-display-bold text-screenTitle text-dialogue-text mb-2">
        Tell us about yourself
      </h1>
      <p className="font-body text-body text-dialogue-textMuted mb-8">
        This helps your pharmacist understand your health history.
      </p>

      <DynamicQuestionnaire onSubmit={handleSubmit} isLoading={isLoading} />
    </main>
  )
}
