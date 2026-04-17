export type BodyStyle = 'sedan' | 'suv' | 'crossover' | 'truck' | 'van' | 'coupe' | 'hatchback'
export type FuelType = 'gas' | 'hybrid' | 'phev' | 'electric' | 'diesel'
export type Priority = 'safety' | 'fuel_economy' | 'reliability' | 'cargo' | 'comfort' | 'performance' | 'tech' | 'value'

export interface Vehicle {
  id: string
  make: string
  model: string
  year: number
  trim: string
  body_style: BodyStyle
  fuel_type: FuelType
  msrp: number
  seats: number
  mpg_combined: number | null
  range_miles: number | null
  cargo_cuft: number
  horsepower: number
  scores: Record<Priority, number>
  features: string[]
}

export interface UserProfile {
  budget_min: number
  budget_max: number
  body_styles: BodyStyle[]
  fuel_types: FuelType[]
  passengers_min: number
  daily_miles: number
  priorities: Priority[]
  must_haves: string[]
  deal_breakers: string[]
  notes: string
}

export interface Recommendation {
  vehicle: Vehicle
  score: number
  likes: string[]
  dislikes: string[]
  explanation: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}
