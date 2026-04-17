import { Vehicle, UserProfile, Recommendation, Priority } from '@/types'
import { rankToWeights } from './priorities'

const ALL_PRIORITIES: Priority[] = [
  'safety', 'fuel_economy', 'reliability', 'cargo',
  'comfort', 'performance', 'tech', 'value',
]

export function scoreVehicles(vehicles: Vehicle[], profile: UserProfile): Recommendation[] {
  const weights = rankToWeights(profile.priorities)

  // Hard filters — relax budget by 10% if too restrictive
  const filter = (budgetFlex = 0) => vehicles.filter(v => {
    const maxBudget = profile.budget_max * (1 + budgetFlex)
    const minBudget = profile.budget_min * (1 - budgetFlex)
    if (v.msrp < minBudget || v.msrp > maxBudget) return false
    if (profile.body_styles.length > 0 && !profile.body_styles.includes(v.body_style)) return false
    if (profile.fuel_types.length > 0 && !profile.fuel_types.includes(v.fuel_type)) return false
    if (v.seats < profile.passengers_min) return false
    if (profile.must_haves.some(f => !v.features.includes(f))) return false
    if (profile.deal_breakers.some(f => v.features.includes(f))) return false
    return true
  })

  let candidates = filter(0)
  if (candidates.length < 3) candidates = filter(0.1)
  if (candidates.length < 3) candidates = vehicles // full fallback

  // Score each candidate
  const scored = candidates.map(v => {
    const total = ALL_PRIORITIES.reduce((sum, p) => sum + v.scores[p] * weights[p], 0)
    return { vehicle: v, raw_score: total }
  })
  scored.sort((a, b) => b.raw_score - a.raw_score)

  // Pick top 3 with make diversity
  const top3: typeof scored = []
  const makes = new Set<string>()
  for (const item of scored) {
    if (top3.length >= 3) break
    if (makes.has(item.vehicle.make) && scored.length > 6) continue
    top3.push(item)
    makes.add(item.vehicle.make)
  }
  while (top3.length < 3 && top3.length < scored.length) {
    const next = scored.find(s => !top3.includes(s))
    if (next) top3.push(next)
    else break
  }

  return top3.map(({ vehicle, raw_score }) => ({
    vehicle,
    score: raw_score,
    likes: buildLikes(vehicle, profile.priorities),
    dislikes: buildDislikes(vehicle, profile.priorities),
    explanation: '', // filled in by /api/recommend
  }))
}

function buildLikes(vehicle: Vehicle, priorities: Priority[]): string[] {
  return priorities
    .filter(p => vehicle.scores[p] >= 0.75)
    .slice(0, 3)
    .map(p => strengthLabel(p, vehicle))
}

function buildDislikes(vehicle: Vehicle, priorities: Priority[]): string[] {
  const weak = priorities.filter(p => vehicle.scores[p] < 0.60)
  if (weak.length === 0) {
    // Pick lowest-scoring priority even if it passes threshold
    const lowest = [...priorities].sort((a, b) => vehicle.scores[a] - vehicle.scores[b])[0]
    return [weaknessLabel(lowest, vehicle)]
  }
  return weak.slice(0, 2).map(p => weaknessLabel(p, vehicle))
}

function strengthLabel(p: Priority, v: Vehicle): string {
  const labels: Record<Priority, string> = {
    safety: 'Top safety ratings (IIHS / NHTSA)',
    fuel_economy: v.fuel_type === 'electric'
      ? `${v.range_miles} mile electric range`
      : `${v.mpg_combined} MPG combined`,
    reliability: 'Proven long-term reliability',
    cargo: `${v.cargo_cuft} cu ft of cargo space`,
    comfort: 'Comfortable, refined ride',
    performance: `${v.horsepower} HP — responsive and fun`,
    tech: 'Modern infotainment & driver assists',
    value: 'Strong value for the price',
  }
  return labels[p]
}

function weaknessLabel(p: Priority, v: Vehicle): string {
  const labels: Record<Priority, string> = {
    safety: 'Safety ratings trail segment leaders',
    fuel_economy: 'Below-average fuel efficiency',
    reliability: 'Some owner-reported reliability concerns',
    cargo: `Cargo space (${v.cargo_cuft} cu ft) is tight for the class`,
    comfort: 'Firm ride — can feel harsh on rough roads',
    performance: 'Modest acceleration for its class',
    tech: 'Infotainment feels a generation behind',
    value: 'Carries a price premium over rivals',
  }
  return labels[p]
}
