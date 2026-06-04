import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY
  const voiceId = process.env.ELEVENLABS_VOICE_ID

  if (!apiKey || apiKey.startsWith('placeholder') || !voiceId || voiceId.startsWith('placeholder')) {
    return NextResponse.json({ error: 'TTS not configured' }, { status: 503 })
  }

  try {
    const { text } = await req.json()

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.5, similarity_boost: 0.8 },
        }),
      }
    )

    if (!response.ok) {
      return NextResponse.json({ error: 'TTS failed' }, { status: 500 })
    }

    return new Response(response.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (err) {
    console.error('TTS error:', err)
    return NextResponse.json({ error: 'TTS unavailable' }, { status: 500 })
  }
}
