import type { AuctionState, Lot, Player } from './domain/types'

export function makePlayer(overrides: Partial<Player> & { id: string; name: string }): Player {
  return { balance: 1000, lotsWon: [], ...overrides }
}

export function makeLot(overrides: Partial<Lot> & { id: string }): Lot {
  return {
    label: overrides.id,
    teams: [{ name: 'Team A', seed: 1, region: 'East' }],
    ...overrides,
  }
}

export function makeBaseState(overrides?: Partial<AuctionState>): AuctionState {
  const players = [
    makePlayer({ id: 'p1', name: 'Alice' }),
    makePlayer({ id: 'p2', name: 'Bob' }),
    makePlayer({ id: 'p3', name: 'Charlie' }),
  ]
  const lots = [makeLot({ id: 'lot1' }), makeLot({ id: 'lot2' }), makeLot({ id: 'lot3' })]

  return {
    auctionId: 'test-auction',
    players,
    lots,
    lotStates: {
      lot1: { status: 'pending' },
      lot2: { status: 'pending' },
      lot3: { status: 'pending' },
    },
    currentLotIndex: 0,
    phase: 'setup',
    openerPlayerId: 'p1',
    adminId: 'admin',
    stateHistory: [],
    paused: false,
    ...overrides,
  }
}
