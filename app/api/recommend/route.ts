import { complete } from '@/lib/llm'
import { getVehicles } from '@/lib/vehicles'
import { scoreVehicles } from '@/lib/scoring'
import { UserProfile, Recommendation } from '@/types'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const { profile } = await req.json() as { profile: UserProfile }

  const vehicles = getVehicles()
  const recs = scoreVehicles(vehicles, profile)

  if (recs.length === 0) {
    return Response.json({ error: 'No vehicles match your criteria. Try broadening your filters.' }, { status: 404 })
  }

  // Ask LLM to write one-paragraph explanations for each car
  const explainPrompt = `You are a car recommendation assistant. Write a concise, honest 2-sentence explanation for each of the following recommended vehicles, based on the user's profile. Reference specific numbers. Always mention one real tradeoff. Return a JSON array and nothing else, in this format:
[{"rank":1,"explanation":"..."},{"rank":2,"explanation":"..."},{"rank":3,"explanation":"..."}]`

  const explainInput = JSON.stringify({
    profile,
    recommendations: recs.map((r, i) => ({
      rank: i + 1,
      vehicle: `${r.vehicle.year} ${r.vehicle.make} ${r.vehicle.model} ${r.vehicle.trim}`,
      msrp: r.vehicle.msrp,
      mpg: r.vehicle.mpg_combined,
      range: r.vehicle.range_miles,
      horsepower: r.vehicle.horsepower,
      cargo: r.vehicle.cargo_cuft,
      fuel_type: r.vehicle.fuel_type,
      likes: r.likes,
      dislikes: r.dislikes,
    })),
  })

  // Generate initial chat summary message
  const summaryPrompt = `You are a car recommendation assistant. In 3-4 sentences, explain to the user why you chose these 3 vehicles for them, and briefly say which one you'd pick in which scenario. Be specific and conversational.`

  const [explanationsRaw, summary] = await Promise.all([
    complete(explainPrompt, [{ role: 'user', content: explainInput }]),
    complete(summaryPrompt, [{
      role: 'user',
      content: `User profile: ${JSON.stringify(profile)}\n\nTop 3 picks: ${recs.map((r, i) => `${i + 1}. ${r.vehicle.year} ${r.vehicle.make} ${r.vehicle.model}`).join(', ')}`,
    }]),
  ])

  // Parse explanations and attach to recs
  let withExplanations: Recommendation[] = recs
  try {
    const parsed: { rank: number; explanation: string }[] = JSON.parse(explanationsRaw)
    withExplanations = recs.map((r, i) => ({
      ...r,
      explanation: parsed.find(p => p.rank === i + 1)?.explanation ?? '',
    }))
  } catch {
    // Explanations failed to parse — return recs without them
  }

  return Response.json({ recommendations: withExplanations, summary })
}
