import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import { INTAKE_SYSTEM_PROMPT, LOG_READING_TOOL } from '@/prompts/intake-system'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { messages } = await req.json()

  const encoder = new TextEncoder()

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: INTAKE_SYSTEM_PROMPT,
    messages,
    tools: [LOG_READING_TOOL],
  })

  const readable = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))

      stream.on('text', (text) => send({ type: 'text', text }))

      stream.on('message', (message) => {
        for (const block of message.content) {
          if (block.type === 'tool_use') {
            send({ type: 'tool_use', name: block.name, input: block.input })
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      })

      stream.on('error', (err) => {
        send({ type: 'error', message: String(err) })
        controller.close()
      })
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
