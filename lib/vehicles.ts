import { Vehicle } from '@/types'
import vehiclesData from '@/data/vehicles.json'

let cache: Vehicle[] | null = null

export function getVehicles(): Vehicle[] {
  if (!cache) cache = vehiclesData as Vehicle[]
  return cache
}
