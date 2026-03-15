import type { Lot, Player, Team } from './types'

const REGIONS = ['East', 'West', 'South', 'Midwest'] as const

function makeTeam(seed: number, region: string): Team {
  return { name: `${region} ${seed} Seed`, seed, region }
}

function makeBundleLot(region: string, seeds: number[]): Lot {
  const seedLabel = seeds.join('/')
  return {
    id: `${region.toLowerCase()}-${seeds.join('-')}-seeds`,
    label: `${region} ${seedLabel} Seeds`,
    teams: seeds.map((seed) => makeTeam(seed, region)),
  }
}

function makeIndividualLot(seed: number, region: string): Lot {
  return {
    id: `${region.toLowerCase()}-seed-${seed}`,
    label: `${region} ${seed} Seed`,
    teams: [makeTeam(seed, region)],
  }
}

export function generateDefaultLots(): Lot[] {
  const lots: Lot[] = []

  // Group by region: bundles first (14/15/16, 12/13), then individual seeds 11 down to 1
  for (const region of REGIONS) {
    lots.push(makeBundleLot(region, [14, 15, 16]))
    lots.push(makeBundleLot(region, [12, 13]))
    for (let seed = 11; seed >= 1; seed--) {
      lots.push(makeIndividualLot(seed, region))
    }
  }

  return lots
}

export type DefaultConfig = {
  players: Player[]
  lots: Lot[]
  openerPlayerId: string
}

export async function loadDefaultConfig(): Promise<DefaultConfig> {
  try {
    const res = await fetch('/default-config.json')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const config = await res.json()
    if (Array.isArray(config.lots) && config.lots.length > 0) {
      return config as DefaultConfig
    }
  } catch {
    // Fall back to hardcoded defaults
  }
  return {
    players: [],
    lots: generateDefaultLots(),
    openerPlayerId: '',
  }
}
