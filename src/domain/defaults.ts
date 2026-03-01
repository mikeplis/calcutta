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

  // Group by region: bundles first (15/16, 13/14), then individual seeds 12 down to 1
  for (const region of REGIONS) {
    lots.push(makeBundleLot(region, [15, 16]))
    lots.push(makeBundleLot(region, [13, 14]))
    for (let seed = 12; seed >= 1; seed--) {
      lots.push(makeIndividualLot(seed, region))
    }
  }

  return lots
}
