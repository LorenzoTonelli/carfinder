// Provider-agnostic LLM wrapper.
// To switch LLM providers, update only this file.
// Current provider: Google AI (gemini-2.5-flash-lite)

import { GoogleGenerativeAI, Content } from '@google/generative-ai'
import { ChatMessage } from '@/types'

const MODEL = 'gemini-2.5-flash-lite'

function client() {
  return new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)
}

function toGoogleFormat(messages: ChatMessage[]): Content[] {
  return messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
}

// Returns a streaming response (text chunks as Uint8Array).
export async function streamChat(
  systemPrompt: string,
  messages: ChatMessage[]
): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder()
  const model = client().getGenerativeModel({
    model: MODEL,
    systemInstruction: systemPrompt,
  })

  const result = await model.generateContentStream({
    contents: toGoogleFormat(messages),
  })

  return new ReadableStream({
    async start(controller) {
      for await (const chunk of result.stream) {
        const text = chunk.text()
        if (text) controller.enqueue(encoder.encode(text))
      }
      controller.close()
    },
  })
}

// Returns a complete (non-streaming) response.
export async function complete(
  systemPrompt: string,
  messages: ChatMessage[]
): Promise<string> {
  const model = client().getGenerativeModel({
    model: MODEL,
    systemInstruction: systemPrompt,
  })

  const result = await model.generateContent({
    contents: toGoogleFormat(messages),
  })

  return result.response.text()
}
