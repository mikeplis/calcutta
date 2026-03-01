import type { Lot, Team } from './types'

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

  // Bundle lots: 15/16 seeds and 13/14 seeds for each region
  for (const region of REGIONS) {
    lots.push(makeBundleLot(region, [15, 16]))
    lots.push(makeBundleLot(region, [13, 14]))
  }

  // Individual lots: seeds 1-12 for each region
  for (const region of REGIONS) {
    for (let seed = 1; seed <= 12; seed++) {
      lots.push(makeIndividualLot(seed, region))
    }
  }

  return lots
}
