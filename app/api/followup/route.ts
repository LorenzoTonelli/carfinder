import { streamChat } from '@/lib/llm'
import { ChatMessage, UserProfile, Recommendation } from '@/types'

export const dynamic = 'force-dynamic'

function buildSystemPrompt(profile: UserProfile, recs: Recommendation[]): string {
  const carList = recs
    .map((r, i) => `${i + 1}. ${r.vehicle.year} ${r.vehicle.make} ${r.vehicle.model} ${r.vehicle.trim} — $${r.vehicle.msrp.toLocaleString()}`)
    .join('\n')

  return `You are a car recommendation assistant. You already recommended 3 vehicles to this user. Answer their follow-up questions honestly and specifically.

User profile:
${JSON.stringify(profile, null, 2)}

Recommended vehicles:
${carList}

Detailed info:
${JSON.stringify(recs.map(r => ({ vehicle: r.vehicle, likes: r.likes, dislikes: r.dislikes })), null, 2)}

Guidelines:
- Reference the user's specific priorities when relevant
- If asked to compare, be direct and concrete
- If asked about a car that wasn't recommended, briefly acknowledge it and explain why it wasn't in the top 3
- Keep answers concise (2-4 sentences unless more detail is needed)`
}

export async function POST(req: Request) {
  const { messages, profile, recommendations } = await req.json() as {
    messages: ChatMessage[]
    profile: UserProfile
    recommendations: Recommendation[]
  }

  const systemPrompt = buildSystemPrompt(profile, recommendations)
  const stream = await streamChat(systemPrompt, messages)

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  })
}
