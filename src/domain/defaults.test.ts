import { describe, it, expect, vi } from 'vitest'
import { generateDefaultLots, loadDefaultConfig } from './defaults'

describe('generateDefaultLots', () => {
  const lots = generateDefaultLots()

  it('generates 56 total lots', () => {
    expect(lots).toHaveLength(56)
  })

  it('generates 8 bundle lots (2 per region)', () => {
    const bundles = lots.filter((l) => l.teams.length === 2)
    expect(bundles).toHaveLength(8)
  })

  it('generates 48 individual lots', () => {
    const individuals = lots.filter((l) => l.teams.length === 1)
    expect(individuals).toHaveLength(48)
  })

  it('has unique IDs for all lots', () => {
    const ids = lots.map((l) => l.id)
    expect(new Set(ids).size).toBe(56)
  })

  it('bundle lots contain correct seeds', () => {
    const east1516 = lots.find((l) => l.id === 'east-15-16-seeds')!
    expect(east1516.teams.map((t) => t.seed)).toEqual([15, 16])
    expect(east1516.label).toBe('East 15/16 Seeds')

    const west1314 = lots.find((l) => l.id === 'west-13-14-seeds')!
    expect(west1314.teams.map((t) => t.seed)).toEqual([13, 14])
  })

  it('individual lots cover seeds 1-12 for each region', () => {
    for (const region of ['East', 'West', 'South', 'Midwest']) {
      for (let seed = 1; seed <= 12; seed++) {
        const lot = lots.find((l) => l.id === `${region.toLowerCase()}-seed-${seed}`)
        expect(lot).toBeDefined()
        expect(lot!.teams[0].seed).toBe(seed)
        expect(lot!.teams[0].region).toBe(region)
      }
    }
  })

  it('lots are grouped by region with bundles first then seeds 12 to 1', () => {
    // Each region should have 14 lots: 2 bundles + 12 individual
    for (let r = 0; r < 4; r++) {
      const regionLots = lots.slice(r * 14, (r + 1) * 14)

      // First two are bundles
      expect(regionLots[0].teams).toHaveLength(2)
      expect(regionLots[1].teams).toHaveLength(2)

      // Remaining 12 are individual, from seed 12 down to 1
      for (let i = 0; i < 12; i++) {
        expect(regionLots[2 + i].teams).toHaveLength(1)
        expect(regionLots[2 + i].teams[0].seed).toBe(12 - i)
      }
    }
  })
})

describe('loadDefaultConfig', () => {
  it('returns fetched config when JSON is available', async () => {
    const mockConfig = {
      players: [],
      lots: [{ id: 'lot1', label: 'Test', teams: [{ name: 'Duke', seed: 1, region: 'East' }] }],
      openerPlayerId: '',
    }
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockConfig),
    } as Response)

    const config = await loadDefaultConfig()
    expect(config.lots).toEqual(mockConfig.lots)

    vi.restoreAllMocks()
  })

  it('falls back to hardcoded defaults when fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'))

    const config = await loadDefaultConfig()
    expect(config.lots).toHaveLength(56)
    expect(config.lots[0].teams[0].name).toBe('East 15 Seed')

    vi.restoreAllMocks()
  })

  it('falls back to hardcoded defaults when response has empty lots', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ players: [], lots: [], openerPlayerId: '' }),
    } as Response)

    const config = await loadDefaultConfig()
    expect(config.lots).toHaveLength(56)

    vi.restoreAllMocks()
  })
})
