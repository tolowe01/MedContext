'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { logReading } from '@/actions/log-reading'
import { DailyLog, LogReadingInput } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send } from 'lucide-react'
import VoiceInputButton from './VoiceInputButton'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatIntakeProps {
  patientId: string
  logs?: DailyLog[]
  /** Consecutive days logged before today; used for the celebration message. */
  streak?: number
  onComplete?: (logs: DailyLog[]) => void
}

/** Encouragement is about effort/consistency only — never about health values. */
function celebrationMessage(streakDays: number): string {
  if (streakDays >= 7) {
    return "Amazing — that's 7 days in a row! You completed the full week. Thank you so much for showing up every day. 🎉"
  }
  if (streakDays >= 2) {
    return `Logged! 🎉 That's ${streakDays} days in a row — wonderful job staying consistent. See you tomorrow.`
  }
  return 'Logged — thank you so much for checking in today! 🎉 Great job. See you tomorrow.'
}

function notifyStreak(streakDays: number) {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return
  try {
    const body =
      streakDays >= 2
        ? `You've logged ${streakDays} days in a row. Great job!`
        : 'Thanks for checking in today. Great job!'
    new Notification('MedContext', { body })
  } catch {
    // Notifications are best-effort.
  }
}

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content:
    "Good evening. Ready to log today's reading? You can type your numbers or hold the mic to speak.",
}

export default function ChatIntake({ patientId, logs = [], streak = 0, onComplete }: ChatIntakeProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [pendingReading, setPendingReading] = useState<LogReadingInput | null>(null)
  const [enteredVia, setEnteredVia] = useState<'text' | 'voice'>('text')
  const [isConfirming, setIsConfirming] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(userText: string, via: 'text' | 'voice' = 'text') {
    if (!userText.trim() || isLoading) return

    const userMessage: Message = { role: 'user', content: userText.trim() }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setInput('')
    setIsLoading(true)
    setEnteredVia(via)

    const assistantPlaceholder: Message = { role: 'assistant', content: '' }
    setMessages((prev) => [...prev, assistantPlaceholder])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      })

      if (!response.body) {
        setIsLoading(false)
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') {
            setIsLoading(false)
            continue
          }

          let parsed: { type: string; text?: string; name?: string; input?: LogReadingInput }
          try {
            parsed = JSON.parse(raw)
          } catch {
            continue
          }

          if (parsed.type === 'text' && parsed.text) {
            setMessages((prev) => {
              const updated = [...prev]
              const last = updated[updated.length - 1]
              return [
                ...updated.slice(0, -1),
                { ...last, content: last.content + parsed.text },
              ]
            })
          }

          if (parsed.type === 'tool_use' && parsed.input) {
            setPendingReading(parsed.input)
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev]
        return [
          ...updated.slice(0, -1),
          {
            role: 'assistant',
            content: "Sorry, I couldn't connect. Please try again.",
          },
        ]
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleConfirm() {
    if (!pendingReading) return
    setIsConfirming(true)
    try {
      const result = await logReading(pendingReading, enteredVia)
      if (result && 'error' in result && result.error) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: "Sorry, I couldn't save that reading. Please try again.",
          },
        ])
        return
      }
      setPendingReading(null)
      const newStreak = streak + 1
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: celebrationMessage(newStreak) },
      ])
      notifyStreak(newStreak)
      if (onComplete) {
        onComplete(logs)
      } else {
        setIsDone(true)
      }
    } catch {
      // allow re-try; pendingReading stays so user can confirm again
    } finally {
      setIsConfirming(false)
    }
  }

  function handleEdit() {
    setPendingReading(null)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input, 'text')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 min-h-[40vh] max-h-[60vh] sm:max-h-[55vh] landscape:max-h-[70vh] overflow-y-auto pb-2">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
          >
            {msg.role === 'assistant' && (
              <Image
                src="/doctor-avatar.png"
                alt="Doctor avatar"
                width={36}
                height={36}
                className="rounded-full object-cover shrink-0 mr-3 self-end"
              />
            )}
            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-card px-4 py-3 font-body text-body leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-mc-primary-400 text-white'
                  : 'bg-mc-teal-50 border border-mc-teal-100 text-mc-neutral-900'
              }`}
            >
              {msg.content || (isLoading && idx === messages.length - 1 ? (
                <span className="animate-pulse text-mc-neutral-400">…</span>
              ) : null)}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {pendingReading && (
        <div className="bg-mc-surface-white border border-mc-neutral-200 rounded-card p-5">
          <p className="font-body-bold text-cta text-mc-neutral-400 uppercase tracking-wide mb-3">
            Confirm reading
          </p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-mc-neutral-100 rounded-button px-3 py-2">
              <p className="text-xs text-mc-neutral-400 font-body">Systolic</p>
              <p className="font-display-semi text-sectionTitle text-mc-neutral-900">
                {pendingReading.systolic}
              </p>
            </div>
            <div className="bg-mc-neutral-100 rounded-button px-3 py-2">
              <p className="text-xs text-mc-neutral-400 font-body">Diastolic</p>
              <p className="font-display-semi text-sectionTitle text-mc-neutral-900">
                {pendingReading.diastolic}
              </p>
            </div>
            {pendingReading.heart_rate && (
              <div className="bg-mc-neutral-100 rounded-button px-3 py-2">
                <p className="text-xs text-mc-neutral-400 font-body">Heart rate</p>
                <p className="font-display-semi text-sectionTitle text-mc-neutral-900">
                  {pendingReading.heart_rate}
                </p>
              </div>
            )}
            <div className="bg-mc-neutral-100 rounded-button px-3 py-2">
              <p className="text-xs text-mc-neutral-400 font-body">Medication</p>
              <p className="font-display-semi text-sectionTitle text-mc-neutral-900">
                {pendingReading.adherence_taken ? 'Taken' : 'Not taken'}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleConfirm}
              disabled={isConfirming}
              className="flex-1 bg-mc-primary-400 hover:bg-mc-primary-600 text-white font-cta text-cta rounded-button py-3"
            >
              {isConfirming ? 'Saving…' : 'Confirm'}
            </Button>
            <Button
              onClick={handleEdit}
              variant="outline"
              className="flex-1 border-mc-neutral-200 text-mc-neutral-900 font-cta text-cta rounded-button py-3 bg-transparent hover:bg-mc-neutral-100"
            >
              Edit
            </Button>
          </div>
        </div>
      )}

      {isDone ? (
        <Button
          onClick={() => router.push('/home')}
          className="w-full bg-mc-primary-400 hover:bg-mc-primary-600 text-white font-cta text-cta rounded-button py-4 mt-2"
        >
          Back to Homepage
        </Button>
      ) : !pendingReading && (
        <div className="flex items-end gap-2 bg-mc-surface-white border border-mc-neutral-200 rounded-card px-3 py-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your BP reading…"
            disabled={isLoading}
            rows={1}
            className="flex-1 resize-none border-0 bg-transparent text-mc-neutral-900 placeholder:text-mc-neutral-400 focus-visible:ring-0 focus-visible:ring-offset-0 font-body text-body p-0 min-h-[24px]"
          />
          <VoiceInputButton
            disabled={isLoading}
            onTranscript={(text) => sendMessage(text, 'voice')}
          />
          <button
            type="button"
            onClick={() => sendMessage(input, 'text')}
            disabled={isLoading || !input.trim()}
            aria-label="Send message"
            className="flex items-center justify-center shrink-0 min-h-[44px] min-w-[44px] rounded-full bg-mc-primary-400 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:bg-mc-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-primary-200 focus-visible:ring-offset-2 focus-visible:ring-offset-mc-surface-white"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      )}
    </div>
  )
}
