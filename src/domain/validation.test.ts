import { describe, it, expect } from 'vitest'
import { validateConfig } from './validation'

function makeValidConfig() {
  return {
    players: [
      { id: 'p1', name: 'Alice', balance: 100, lotsWon: [] },
      { id: 'p2', name: 'Bob', balance: 100, lotsWon: [] },
    ],
    lots: [
      { id: 'lot1', label: 'Lot 1', teams: [{ name: 'Team A', seed: 1, region: 'East' }] },
    ],
    openerPlayerId: 'p1',
  }
}

describe('validateConfig', () => {
  it('returns null for a valid config', () => {
    expect(validateConfig(makeValidConfig())).toBeNull()
  })

  it('rejects non-object config', () => {
    expect(validateConfig('not an object')).toBe('Config must be an object')
    expect(validateConfig(null)).toBe('Config must be an object')
  })

  it('rejects missing players array', () => {
    const config = makeValidConfig()
    ;(config as Record<string, unknown>).players = 'not an array'
    expect(validateConfig(config)).toBe('Missing or invalid "players" array')
  })

  it('rejects player with missing name', () => {
    const config = makeValidConfig()
    config.players[0] = { id: 'p1', name: '', balance: 100, lotsWon: [] }
    expect(validateConfig(config)).toContain('invalid or missing "name"')
  })

  it('rejects player with negative balance', () => {
    const config = makeValidConfig()
    config.players[0].balance = -1
    expect(validateConfig(config)).toContain('invalid "balance"')
  })

  it('rejects player with missing lotsWon', () => {
    const config = makeValidConfig()
    ;(config.players[0] as Record<string, unknown>).lotsWon = undefined
    expect(validateConfig(config)).toContain('invalid or missing "lotsWon"')
  })

  it('rejects duplicate player IDs', () => {
    const config = makeValidConfig()
    config.players[1].id = 'p1'
    expect(validateConfig(config)).toBe('Duplicate player ID: "p1"')
  })

  it('rejects lot with empty teams array', () => {
    const config = makeValidConfig()
    config.lots[0].teams = []
    expect(validateConfig(config)).toContain('non-empty "teams" array')
  })

  it('rejects duplicate lot IDs', () => {
    const config = makeValidConfig()
    config.lots.push({ id: 'lot1', label: 'Lot 1 dup', teams: [{ name: 'X', seed: 1, region: 'W' }] })
    expect(validateConfig(config)).toBe('Duplicate lot ID: "lot1"')
  })

  it('rejects openerPlayerId that does not reference a valid player', () => {
    const config = makeValidConfig()
    config.openerPlayerId = 'nonexistent'
    expect(validateConfig(config)).toContain('does not reference a valid player ID')
  })

  it('allows empty openerPlayerId', () => {
    const config = makeValidConfig()
    config.openerPlayerId = ''
    expect(validateConfig(config)).toBeNull()
  })

  it('rejects missing lots array', () => {
    const config = makeValidConfig()
    ;(config as Record<string, unknown>).lots = undefined
    expect(validateConfig(config)).toBe('Missing or invalid "lots" array')
  })
})
