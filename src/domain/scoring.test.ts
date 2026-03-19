import { describe, it, expect } from 'vitest'
import { calculatePlayerPoints, getPointsLeaderboard, getTournamentWinnerOwner } from './scoring'
import type { AuctionState } from './types'
import type { TournamentResults } from './tournamentTypes'

function makeState(overrides: Partial<AuctionState> = {}): AuctionState {
  return {
    auctionId: 'test',
    players: [],
    lots: [],
    lotStates: {},
    currentLotIndex: 0,
    phase: 'complete',
    openerPlayerId: '',
    adminId: 'admin',
    stateHistory: [],
    paused: false,
    claimedPlayers: {},
    testMode: false,
    ...overrides,
  }
}

function makeResults(overrides: Partial<TournamentResults> = {}): TournamentResults {
  return {
    year: 2025,
    lastUpdated: Date.now(),
    teams: [],
    eliminatedTeams: [],
    ...overrides,
  }
}

describe('calculatePlayerPoints', () => {
  it('returns 0 for all players when no results', () => {
    const state = makeState({
      players: [{ id: 'p1', name: 'Alice', balance: 100, lotsWon: [] }],
    })
    const results = makeResults()
    expect(calculatePlayerPoints(state, results)).toEqual({ p1: 0 })
  })

  it('returns 0 for player with no lots won', () => {
    const state = makeState({
      players: [{ id: 'p1', name: 'Alice', balance: 100, lotsWon: [] }],
      lots: [{ id: 'lot1', label: 'Duke', teams: [{ name: 'Duke', seed: 1, region: 'East' }] }],
    })
    const results = makeResults({
      teams: [{ name: 'Duke', seed: 1, roundsWon: [1, 2, 3], isChampion: false }],
    })
    expect(calculatePlayerPoints(state, results)).toEqual({ p1: 0 })
  })

  it('calculates points for a player with one team winning rounds', () => {
    // seed=1, rounds 1+2 = 1×1 + 1×2 = 3 pts
    const state = makeState({
      players: [{ id: 'p1', name: 'Alice', balance: 100, lotsWon: ['lot1'] }],
      lots: [{ id: 'lot1', label: 'Duke', teams: [{ name: 'Duke', seed: 1, region: 'East' }] }],
    })
    const results = makeResults({
      teams: [{ name: 'Duke', seed: 1, roundsWon: [1, 2], isChampion: false }],
    })
    expect(calculatePlayerPoints(state, results)).toEqual({ p1: 3 })
  })

  it('calculates points for a lot with 2 teams', () => {
    // seed=10, round 1 = 10 pts; seed=7, round 1 = 7 pts; total = 17
    const state = makeState({
      players: [{ id: 'p1', name: 'Alice', balance: 100, lotsWon: ['lot1'] }],
      lots: [
        {
          id: 'lot1',
          label: 'East 10/7',
          teams: [
            { name: 'TeamA', seed: 10, region: 'East' },
            { name: 'TeamB', seed: 7, region: 'East' },
          ],
        },
      ],
    })
    const results = makeResults({
      teams: [
        { name: 'TeamA', seed: 10, roundsWon: [1], isChampion: false },
        { name: 'TeamB', seed: 7, roundsWon: [1], isChampion: false },
      ],
    })
    expect(calculatePlayerPoints(state, results)).toEqual({ p1: 17 })
  })

  it('handles multiple players with different lots', () => {
    // p1: Duke(1) wins round 1 → 1 pt; p2: UNC(8) wins rounds 1,2 → 8+16=24 pts
    const state = makeState({
      players: [
        { id: 'p1', name: 'Alice', balance: 100, lotsWon: ['lot1'] },
        { id: 'p2', name: 'Bob', balance: 100, lotsWon: ['lot2'] },
      ],
      lots: [
        { id: 'lot1', label: 'Duke', teams: [{ name: 'Duke', seed: 1, region: 'East' }] },
        { id: 'lot2', label: 'UNC', teams: [{ name: 'UNC', seed: 8, region: 'East' }] },
      ],
    })
    const results = makeResults({
      teams: [
        { name: 'Duke', seed: 1, roundsWon: [1], isChampion: false },
        { name: 'UNC', seed: 8, roundsWon: [1, 2], isChampion: false },
      ],
    })
    const points = calculatePlayerPoints(state, results)
    expect(points).toEqual({ p1: 1, p2: 24 })
  })

  it('ignores teams not in results', () => {
    const state = makeState({
      players: [{ id: 'p1', name: 'Alice', balance: 100, lotsWon: ['lot1'] }],
      lots: [{ id: 'lot1', label: 'Duke', teams: [{ name: 'Duke', seed: 1, region: 'East' }] }],
    })
    const results = makeResults({ teams: [] })
    expect(calculatePlayerPoints(state, results)).toEqual({ p1: 0 })
  })
})

describe('getPointsLeaderboard', () => {
  it('returns players sorted by points descending', () => {
    const state = makeState({
      players: [
        { id: 'p1', name: 'Alice', balance: 100, lotsWon: ['lot1'] },
        { id: 'p2', name: 'Bob', balance: 100, lotsWon: ['lot2'] },
      ],
      lots: [
        { id: 'lot1', label: 'Duke', teams: [{ name: 'Duke', seed: 1, region: 'East' }] },
        { id: 'lot2', label: 'UNC', teams: [{ name: 'UNC', seed: 8, region: 'East' }] },
      ],
    })
    const results = makeResults({
      teams: [
        { name: 'Duke', seed: 1, roundsWon: [1], isChampion: false },
        { name: 'UNC', seed: 8, roundsWon: [1, 2], isChampion: false },
      ],
    })
    const leaderboard = getPointsLeaderboard(state, results)
    expect(leaderboard[0].player.id).toBe('p2') // Bob: 24 pts
    expect(leaderboard[0].points).toBe(24)
    expect(leaderboard[1].player.id).toBe('p1') // Alice: 1 pt
    expect(leaderboard[1].points).toBe(1)
  })

  it('includes per-team breakdown', () => {
    const state = makeState({
      players: [{ id: 'p1', name: 'Alice', balance: 100, lotsWon: ['lot1'] }],
      lots: [{ id: 'lot1', label: 'Duke', teams: [{ name: 'Duke', seed: 1, region: 'East' }] }],
    })
    const results = makeResults({
      teams: [{ name: 'Duke', seed: 1, roundsWon: [1, 2], isChampion: false }],
    })
    const leaderboard = getPointsLeaderboard(state, results)
    expect(leaderboard[0].breakdown).toEqual([{ teamName: 'Duke', seed: 1, points: 3 }])
  })

  it('returns empty array for no players', () => {
    const state = makeState()
    const results = makeResults()
    expect(getPointsLeaderboard(state, results)).toEqual([])
  })
})

describe('getTournamentWinnerOwner', () => {
  it('returns null when no champion', () => {
    const state = makeState({
      players: [{ id: 'p1', name: 'Alice', balance: 100, lotsWon: ['lot1'] }],
      lots: [{ id: 'lot1', label: 'Duke', teams: [{ name: 'Duke', seed: 1, region: 'East' }] }],
    })
    const results = makeResults({
      teams: [{ name: 'Duke', seed: 1, roundsWon: [1, 2, 3, 4, 5, 6], isChampion: false }],
    })
    expect(getTournamentWinnerOwner(state, results)).toBeNull()
  })

  it('returns player who owns the champion', () => {
    const state = makeState({
      players: [
        { id: 'p1', name: 'Alice', balance: 100, lotsWon: ['lot1'] },
        { id: 'p2', name: 'Bob', balance: 100, lotsWon: ['lot2'] },
      ],
      lots: [
        { id: 'lot1', label: 'Duke', teams: [{ name: 'Duke', seed: 1, region: 'East' }] },
        { id: 'lot2', label: 'UNC', teams: [{ name: 'UNC', seed: 8, region: 'East' }] },
      ],
    })
    const results = makeResults({
      teams: [{ name: 'Duke', seed: 1, roundsWon: [1, 2, 3, 4, 5, 6], isChampion: true }],
    })
    const owner = getTournamentWinnerOwner(state, results)
    expect(owner?.id).toBe('p1')
    expect(owner?.name).toBe('Alice')
  })

  it('finds champion in lot with 2 teams', () => {
    const state = makeState({
      players: [{ id: 'p1', name: 'Alice', balance: 100, lotsWon: ['lot1'] }],
      lots: [
        {
          id: 'lot1',
          label: 'East 15/16',
          teams: [
            { name: 'TeamA', seed: 15, region: 'East' },
            { name: 'TeamB', seed: 16, region: 'East' },
          ],
        },
      ],
    })
    const results = makeResults({
      teams: [{ name: 'TeamB', seed: 16, roundsWon: [1, 2, 3, 4, 5, 6], isChampion: true }],
    })
    const owner = getTournamentWinnerOwner(state, results)
    expect(owner?.id).toBe('p1')
  })

  it('returns null when champion is not owned by any player', () => {
    const state = makeState({
      players: [{ id: 'p1', name: 'Alice', balance: 100, lotsWon: [] }],
      lots: [{ id: 'lot1', label: 'Duke', teams: [{ name: 'Duke', seed: 1, region: 'East' }] }],
    })
    const results = makeResults({
      teams: [{ name: 'Duke', seed: 1, roundsWon: [1, 2, 3, 4, 5, 6], isChampion: true }],
    })
    expect(getTournamentWinnerOwner(state, results)).toBeNull()
  })

  it('returns null when results teams list is empty', () => {
    const state = makeState({
      players: [{ id: 'p1', name: 'Alice', balance: 100, lotsWon: ['lot1'] }],
      lots: [{ id: 'lot1', label: 'Duke', teams: [{ name: 'Duke', seed: 1, region: 'East' }] }],
    })
    const results = makeResults({ teams: [] })
    expect(getTournamentWinnerOwner(state, results)).toBeNull()
  })
})
