'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic } from 'lucide-react'

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void
  disabled?: boolean
}

export default function VoiceInputButton({ onTranscript, disabled = false }: VoiceInputButtonProps) {
  const [isSupported, setIsSupported] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function') {
      setIsSupported(true)
    }
  }, [])

  if (!isSupported) {
    return null
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        await transcribeBlob(blob)
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
    } catch {
      return null
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current = null
    setIsRecording(false)
  }

  async function transcribeBlob(blob: Blob) {
    try {
      const formData = new FormData()
      formData.append('audio', blob, 'recording.webm')

      const response = await fetch('/api/stt', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) return

      const data = await response.json()
      if (data?.transcript) {
        onTranscript(data.transcript)
      }
    } catch {
      return null
    }
  }

  function handleClick() {
    if (disabled) return
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
      className={`rounded-full p-3 border transition-all ${
        isRecording
          ? 'border-bg-emergency bg-red-900/30 animate-pulse'
          : 'bg-dialogue-surface border-dialogue-border hover:border-dialogue-accent'
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      <Mic
        className={`w-4 h-4 ${isRecording ? 'text-red-400' : 'text-dialogue-textMuted'}`}
      />
    </button>
  )
}
