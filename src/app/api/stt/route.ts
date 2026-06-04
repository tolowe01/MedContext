import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audio = formData.get('audio') as File

    if (!audio) {
      return NextResponse.json({ error: 'No audio provided' }, { status: 400 })
    }

    const elevenLabsForm = new FormData()
    elevenLabsForm.append('audio', audio)
    elevenLabsForm.append('model_id', 'scribe_v1')

    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY! },
      body: elevenLabsForm,
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('ElevenLabs STT error:', text)
      return NextResponse.json({ error: 'STT failed' }, { status: 500 })
    }

    const data = await response.json()
    return NextResponse.json({ transcript: data.text })
  } catch (err) {
    console.error('STT route error:', err)
    return NextResponse.json({ error: 'STT unavailable' }, { status: 500 })
  }
}
