'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Bot, Info, PhoneCall } from 'lucide-react'

interface DisclaimerCard {
  id: string
  icon: React.ReactNode
  title: string
  body: string
}

const DISCLAIMER_CARDS: DisclaimerCard[] = [
  {
    id: 'ai_not_professional',
    icon: <Bot className="w-6 h-6 text-dialogue-accent" />,
    title: 'AI is not a healthcare professional',
    body: 'The AI assistant that collects your readings is a software tool. It does not diagnose conditions, interpret clinical results, or replace the judgment of your pharmacist or physician. All clinical decisions are made by your licensed pharmacist.',
  },
  {
    id: 'tool_limitations',
    icon: <Info className="w-6 h-6 text-amber-400" />,
    title: 'Limitations of this tool',
    body: 'MedContext is a monitoring aid, not a medical device. Reading accuracy depends on your own device and technique. This app does not continuously monitor your health — it captures only what you submit. If you feel unwell, contact a healthcare provider directly.',
  },
  {
    id: 'emergency_911',
    icon: <PhoneCall className="w-6 h-6 text-emergency" />,
    title: 'In an emergency, call 911',
    body: 'If you experience chest pain, difficulty breathing, sudden severe headache, weakness on one side of your body, or any other emergency, call 911 immediately. Do not use this app in place of emergency services.',
  },
]

export default function DisclaimersPage() {
  const router = useRouter()
  const [checked, setChecked] = useState<Record<string, boolean>>({
    ai_not_professional: false,
    tool_limitations: false,
    emergency_911: false,
  })

  const allChecked = Object.values(checked).every(Boolean)

  function handleCheck(id: string, value: boolean) {
    setChecked((prev) => ({ ...prev, [id]: value }))
  }

  function handleContinue() {
    if (allChecked) {
      router.push('/onboarding/questionnaire')
    }
  }

  return (
    <main className="min-h-screen bg-dialogue-bg px-screenX pt-screenTop pb-20">
      <h1 className="font-display-bold text-screenTitle text-dialogue-text mb-2">
        Before we start
      </h1>
      <p className="font-body text-body text-dialogue-textMuted mb-6">
        Please read and acknowledge each statement below.
      </p>

      <div className="space-y-gap-card flex flex-col gap-3 mb-8">
        {DISCLAIMER_CARDS.map((card) => (
          <div
            key={card.id}
            className="bg-dialogue-surface rounded-card p-6 border border-dialogue-border"
          >
            <div className="flex items-start gap-4">
              <div className="mt-0.5 shrink-0">{card.icon}</div>
              <div className="flex-1">
                <h2 className="font-display-semi text-sectionTitle text-dialogue-text mb-2">
                  {card.title}
                </h2>
                <p className="font-body text-body text-dialogue-textMuted leading-relaxed mb-4">
                  {card.body}
                </p>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={card.id}
                    checked={checked[card.id]}
                    onCheckedChange={(val) => handleCheck(card.id, val === true)}
                    className="border-dialogue-border data-[state=checked]:bg-dialogue-accent data-[state=checked]:border-dialogue-accent"
                  />
                  <label
                    htmlFor={card.id}
                    className="text-sm font-body text-dialogue-text cursor-pointer select-none"
                  >
                    I understand and acknowledge this
                  </label>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button
        onClick={handleContinue}
        disabled={!allChecked}
        className="w-full bg-dialogue-accent hover:bg-dialogue-accent/90 text-dialogue-bg font-cta text-cta rounded-button py-4 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Continue
      </Button>
    </main>
  )
}
