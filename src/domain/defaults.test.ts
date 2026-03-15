import { describe, it, expect, vi } from 'vitest'
import { generateDefaultLots, loadDefaultConfig } from './defaults'

describe('generateDefaultLots', () => {
  const lots = generateDefaultLots()

  it('generates 52 total lots', () => {
    expect(lots).toHaveLength(52)
  })

  it('generates 4 triple-bundle lots (14/15/16, one per region)', () => {
    const tripleBundles = lots.filter((l) => l.teams.length === 3)
    expect(tripleBundles).toHaveLength(4)
  })

  it('generates 4 double-bundle lots (12/13, one per region)', () => {
    const doubleBundles = lots.filter((l) => l.teams.length === 2)
    expect(doubleBundles).toHaveLength(4)
  })

  it('generates 44 individual lots', () => {
    const individuals = lots.filter((l) => l.teams.length === 1)
    expect(individuals).toHaveLength(44)
  })

  it('has unique IDs for all lots', () => {
    const ids = lots.map((l) => l.id)
    expect(new Set(ids).size).toBe(52)
  })

  it('bundle lots contain correct seeds', () => {
    const east141516 = lots.find((l) => l.id === 'east-14-15-16-seeds')!
    expect(east141516.teams.map((t) => t.seed)).toEqual([14, 15, 16])
    expect(east141516.label).toBe('East 14/15/16 Seeds')

    const west1213 = lots.find((l) => l.id === 'west-12-13-seeds')!
    expect(west1213.teams.map((t) => t.seed)).toEqual([12, 13])
  })

  it('individual lots cover seeds 1-11 for each region', () => {
    for (const region of ['East', 'West', 'South', 'Midwest']) {
      for (let seed = 1; seed <= 11; seed++) {
        const lot = lots.find((l) => l.id === `${region.toLowerCase()}-seed-${seed}`)
        expect(lot).toBeDefined()
        expect(lot!.teams[0].seed).toBe(seed)
        expect(lot!.teams[0].region).toBe(region)
      }
    }
  })

  it('lots are grouped by region with bundles first then seeds 11 to 1', () => {
    // Each region should have 13 lots: 2 bundles + 11 individual
    for (let r = 0; r < 4; r++) {
      const regionLots = lots.slice(r * 13, (r + 1) * 13)

      // First is the 3-team bundle (14/15/16), second is 2-team bundle (12/13)
      expect(regionLots[0].teams).toHaveLength(3)
      expect(regionLots[1].teams).toHaveLength(2)

      // Remaining 11 are individual, from seed 11 down to 1
      for (let i = 0; i < 11; i++) {
        expect(regionLots[2 + i].teams).toHaveLength(1)
        expect(regionLots[2 + i].teams[0].seed).toBe(11 - i)
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
    expect(config.lots).toHaveLength(52)
    expect(config.lots[0].teams[0].name).toBe('East 14 Seed')

    vi.restoreAllMocks()
  })

  it('falls back to hardcoded defaults when response has empty lots', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ players: [], lots: [], openerPlayerId: '' }),
    } as Response)

    const config = await loadDefaultConfig()
    expect(config.lots).toHaveLength(52)

    vi.restoreAllMocks()
  })
})
