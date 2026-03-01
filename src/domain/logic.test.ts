import { describe, it, expect } from 'vitest'
import type { AuctionState, Lot, Player } from './types'
import {
  getCurrentLot,
  getCurrentLotState,
  getMinimumBid,
  canPlayerAffordBid,
  getEligibleBidders,
  getNextBidder,
  isLotOver,
  getActivePlayerTurn,
  isValidBid,
  applyAction,
} from './logic'

// -- Helpers --

function makePlayer(overrides: Partial<Player> & { id: string; name: string }): Player {
  return { balance: 1000, lotsWon: [], ...overrides }
}

function makeLot(overrides: Partial<Lot> & { id: string }): Lot {
  return {
    label: overrides.id,
    teams: [{ name: 'Team A', seed: 1, region: 'East' }],
    ...overrides,
  }
}

function makeBaseState(overrides?: Partial<AuctionState>): AuctionState {
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

function startAuction(state: AuctionState): AuctionState {
  return applyAction(state, { type: 'START_AUCTION' })
}

function placeBid(state: AuctionState, playerId: string, amount: number): AuctionState {
  return applyAction(state, { type: 'PLACE_BID', playerId, amount })
}

function pass(state: AuctionState, playerId: string): AuctionState {
  return applyAction(state, { type: 'PASS', playerId })
}

// -- Tests --

describe('getCurrentLot', () => {
  it('returns the lot at currentLotIndex', () => {
    const state = makeBaseState({ currentLotIndex: 1, phase: 'active' })
    expect(getCurrentLot(state)?.id).toBe('lot2')
  })

  it('returns null when index is out of bounds', () => {
    const state = makeBaseState({ currentLotIndex: 99 })
    expect(getCurrentLot(state)).toBeNull()
  })
})

describe('getCurrentLotState', () => {
  it('returns pending for a lot that has not started', () => {
    const state = makeBaseState({ phase: 'active', currentLotIndex: 0 })
    expect(getCurrentLotState(state)).toEqual({ status: 'pending' })
  })
})

describe('getMinimumBid', () => {
  it('returns 1 for a pending lot', () => {
    const state = makeBaseState({ phase: 'active', currentLotIndex: 0 })
    expect(getMinimumBid(state)).toBe(1)
  })

  it('returns current bid + 1 for an active lot', () => {
    const state = makeBaseState({
      phase: 'active',
      currentLotIndex: 0,
      lotStates: {
        lot1: {
          status: 'active',
          currentBid: { playerId: 'p1', amount: 50, timestamp: 0 },
          passedPlayerIds: [],
          openerId: 'p1',
        },
        lot2: { status: 'pending' },
        lot3: { status: 'pending' },
      },
    })
    expect(getMinimumBid(state)).toBe(51)
  })
})

describe('START_AUCTION', () => {
  it('transitions from setup to active', () => {
    const state = makeBaseState()
    const result = startAuction(state)
    expect(result.phase).toBe('active')
    expect(result.currentLotIndex).toBe(0)
  })

  it('does nothing if not in setup phase', () => {
    const state = makeBaseState({ phase: 'active' })
    const result = startAuction(state)
    expect(result).toBe(state)
  })

  it('requires at least 2 players', () => {
    const state = makeBaseState({
      players: [makePlayer({ id: 'p1', name: 'Alice' })],
    })
    const result = startAuction(state)
    expect(result.phase).toBe('setup')
  })

  it('requires at least 1 lot', () => {
    const state = makeBaseState({ lots: [], lotStates: {} })
    const result = startAuction(state)
    expect(result.phase).toBe('setup')
  })
})

describe('Opening bid', () => {
  it('opener places the first bid and lot becomes active', () => {
    const state = startAuction(makeBaseState())
    const result = placeBid(state, 'p1', 10)
    const lotState = result.lotStates['lot1']
    expect(lotState.status).toBe('active')
    if (lotState.status === 'active') {
      expect(lotState.currentBid.playerId).toBe('p1')
      expect(lotState.currentBid.amount).toBe(10)
      expect(lotState.openerId).toBe('p1')
    }
  })

  it('rejects opening bid from non-opener', () => {
    const state = startAuction(makeBaseState())
    const result = placeBid(state, 'p2', 10)
    expect(result.lotStates['lot1'].status).toBe('pending')
  })

  it('rejects opening bid of 0', () => {
    const state = startAuction(makeBaseState())
    const result = placeBid(state, 'p1', 0)
    expect(result.lotStates['lot1'].status).toBe('pending')
  })

  it('rejects opening bid exceeding balance', () => {
    const state = startAuction(
      makeBaseState({
        players: [
          makePlayer({ id: 'p1', name: 'Alice', balance: 5 }),
          makePlayer({ id: 'p2', name: 'Bob' }),
          makePlayer({ id: 'p3', name: 'Charlie' }),
        ],
      })
    )
    const result = placeBid(state, 'p1', 10)
    expect(result.lotStates['lot1'].status).toBe('pending')
  })

  it('opener can bid their entire balance', () => {
    const state = startAuction(
      makeBaseState({
        players: [
          makePlayer({ id: 'p1', name: 'Alice', balance: 100 }),
          makePlayer({ id: 'p2', name: 'Bob' }),
          makePlayer({ id: 'p3', name: 'Charlie' }),
        ],
      })
    )
    const result = placeBid(state, 'p1', 100)
    const lotState = result.lotStates['lot1']
    expect(lotState.status).toBe('active')
  })
})

describe('Normal bid flow', () => {
  it('players bid in clockwise order', () => {
    let state = startAuction(makeBaseState())
    state = placeBid(state, 'p1', 10) // opener bids

    // p2 is next
    const turn1 = getActivePlayerTurn(state)
    expect(turn1?.id).toBe('p2')

    state = placeBid(state, 'p2', 20)

    // p3 is next
    const turn2 = getActivePlayerTurn(state)
    expect(turn2?.id).toBe('p3')

    state = placeBid(state, 'p3', 30)

    // Back to p1
    const turn3 = getActivePlayerTurn(state)
    expect(turn3?.id).toBe('p1')
  })

  it('bid must be at least current + 1', () => {
    let state = startAuction(makeBaseState())
    state = placeBid(state, 'p1', 10)

    // p2 tries to bid equal to current — invalid
    const result = placeBid(state, 'p2', 10)
    const lotState = result.lotStates['lot1']
    if (lotState.status === 'active') {
      expect(lotState.currentBid.playerId).toBe('p1') // unchanged
    }
  })

  it('raises the current bid', () => {
    let state = startAuction(makeBaseState())
    state = placeBid(state, 'p1', 10)
    state = placeBid(state, 'p2', 15)

    const lotState = state.lotStates['lot1']
    if (lotState.status === 'active') {
      expect(lotState.currentBid.playerId).toBe('p2')
      expect(lotState.currentBid.amount).toBe(15)
    }
  })
})

describe('Pass tracking and turn rotation', () => {
  it('a player can pass and is removed from eligible bidders', () => {
    let state = startAuction(makeBaseState())
    state = placeBid(state, 'p1', 10)
    state = pass(state, 'p2') // p2 passes

    const lotState = state.lotStates['lot1']
    if (lotState.status === 'active') {
      expect(lotState.passedPlayerIds).toContain('p2')
    }

    // p3 is now the active player
    const turn = getActivePlayerTurn(state)
    expect(turn?.id).toBe('p3')
  })

  it('skips passed players in turn rotation', () => {
    let state = startAuction(makeBaseState())
    state = placeBid(state, 'p1', 10)
    state = pass(state, 'p2')
    state = placeBid(state, 'p3', 20)

    // p2 passed, so turn goes back to p1
    const turn = getActivePlayerTurn(state)
    expect(turn?.id).toBe('p1')
  })

  it('rejects pass from wrong player', () => {
    let state = startAuction(makeBaseState())
    state = placeBid(state, 'p1', 10)
    // p3 tries to pass but it's p2's turn
    const result = pass(state, 'p3')
    const lotState = result.lotStates['lot1']
    if (lotState.status === 'active') {
      expect(lotState.passedPlayerIds).not.toContain('p3')
    }
  })
})

describe('Auto-skip when player cannot afford next bid', () => {
  it('auto-skips player whose balance is less than minimum bid', () => {
    const state = startAuction(
      makeBaseState({
        players: [
          makePlayer({ id: 'p1', name: 'Alice', balance: 1000 }),
          makePlayer({ id: 'p2', name: 'Bob', balance: 5 }),
          makePlayer({ id: 'p3', name: 'Charlie', balance: 1000 }),
        ],
      })
    )

    let s = placeBid(state, 'p1', 10)
    // p2 can't afford 11, so they should be skipped — p3 should be active
    const turn = getActivePlayerTurn(s)
    expect(turn?.id).toBe('p3')
  })

  it('player with exactly enough balance can still bid', () => {
    const state = startAuction(
      makeBaseState({
        players: [
          makePlayer({ id: 'p1', name: 'Alice', balance: 1000 }),
          makePlayer({ id: 'p2', name: 'Bob', balance: 11 }),
          makePlayer({ id: 'p3', name: 'Charlie', balance: 1000 }),
        ],
      })
    )

    let s = placeBid(state, 'p1', 10)
    // p2 can afford exactly 11
    const turn = getActivePlayerTurn(s)
    expect(turn?.id).toBe('p2')
  })
})

describe('Lot resolution', () => {
  it('lot is sold when all but one player have passed', () => {
    let state = startAuction(makeBaseState())
    state = placeBid(state, 'p1', 10)
    state = pass(state, 'p2')
    state = pass(state, 'p3')

    // Lot should be sold to p1
    expect(state.lotStates['lot1']).toEqual({
      status: 'sold',
      winnerId: 'p1',
      finalBid: 10,
    })
  })

  it('reduces winner balance and records lot won', () => {
    let state = startAuction(makeBaseState())
    state = placeBid(state, 'p1', 10)
    state = pass(state, 'p2')
    state = pass(state, 'p3')

    const winner = state.players.find((p) => p.id === 'p1')!
    expect(winner.balance).toBe(990)
    expect(winner.lotsWon).toContain('lot1')
  })

  it('advances to next lot after sale', () => {
    let state = startAuction(makeBaseState())
    state = placeBid(state, 'p1', 10)
    state = pass(state, 'p2')
    state = pass(state, 'p3')

    expect(state.currentLotIndex).toBe(1)
  })

  it('winner opens bidding on next lot', () => {
    let state = startAuction(makeBaseState())
    state = placeBid(state, 'p1', 10)
    state = pass(state, 'p2')
    state = pass(state, 'p3')

    // p1 won, so p1 opens the next lot
    expect(state.openerPlayerId).toBe('p1')
  })

  it('lot sold to highest bidder after competitive bidding', () => {
    let state = startAuction(makeBaseState())
    state = placeBid(state, 'p1', 10)
    state = placeBid(state, 'p2', 20)
    state = placeBid(state, 'p3', 30)
    state = pass(state, 'p1')
    state = pass(state, 'p2')

    expect(state.lotStates['lot1']).toEqual({
      status: 'sold',
      winnerId: 'p3',
      finalBid: 30,
    })
    expect(state.players.find((p) => p.id === 'p3')!.balance).toBe(970)
  })
})

describe('Advancing to next lot and resetting pass state', () => {
  it('next lot starts with pending status', () => {
    let state = startAuction(makeBaseState())
    // Sell lot1
    state = placeBid(state, 'p1', 10)
    state = pass(state, 'p2')
    state = pass(state, 'p3')

    // lot2 should be pending
    expect(state.lotStates['lot2'].status).toBe('pending')
    expect(state.currentLotIndex).toBe(1)
  })

  it('pass state is reset for new lot', () => {
    let state = startAuction(makeBaseState())
    // Sell lot1
    state = placeBid(state, 'p1', 10)
    state = pass(state, 'p2')
    state = pass(state, 'p3')

    // Open lot2 (p1 is opener since they won lot1)
    state = placeBid(state, 'p1', 5)

    const lotState = state.lotStates['lot2']
    if (lotState.status === 'active') {
      expect(lotState.passedPlayerIds).toEqual([])
    }
  })
})

describe('Auction completion', () => {
  it('phase becomes complete when all lots are sold', () => {
    let state = startAuction(
      makeBaseState({
        lots: [makeLot({ id: 'lot1' })],
        lotStates: { lot1: { status: 'pending' } },
      })
    )

    state = placeBid(state, 'p1', 10)
    state = pass(state, 'p2')
    state = pass(state, 'p3')

    expect(state.phase).toBe('complete')
  })
})

describe('Opener must bid rule', () => {
  it('opener cannot pass on opening — only bid action is accepted from pending', () => {
    // The opener's action comes from PLACE_BID on a pending lot.
    // There's no mechanism for the opener to "pass" from pending state,
    // because PASS only works on active lots.
    let state = startAuction(makeBaseState())

    // Trying to pass before the lot is active — should have no effect
    const result = pass(state, 'p1')
    expect(result.lotStates['lot1'].status).toBe('pending')
  })
})

describe('Edge case: opener cannot afford to open', () => {
  it('skips to next player who can afford $1', () => {
    const state = startAuction(
      makeBaseState({
        players: [
          makePlayer({ id: 'p1', name: 'Alice', balance: 0 }),
          makePlayer({ id: 'p2', name: 'Bob', balance: 1000 }),
          makePlayer({ id: 'p3', name: 'Charlie', balance: 1000 }),
        ],
        openerPlayerId: 'p1',
      })
    )

    // p1 can't afford $1, so p2 should be able to open
    const result = placeBid(state, 'p2', 10)
    const lotState = result.lotStates['lot1']
    expect(lotState.status).toBe('active')
    if (lotState.status === 'active') {
      expect(lotState.currentBid.playerId).toBe('p2')
    }
  })
})

describe('Budget exhaustion mid-auction', () => {
  it('player with zero balance after winning is skipped in subsequent lots', () => {
    let state = startAuction(
      makeBaseState({
        players: [
          makePlayer({ id: 'p1', name: 'Alice', balance: 10 }),
          makePlayer({ id: 'p2', name: 'Bob', balance: 1000 }),
          makePlayer({ id: 'p3', name: 'Charlie', balance: 1000 }),
        ],
      })
    )

    // p1 bids their whole balance on lot1
    state = placeBid(state, 'p1', 10)
    state = pass(state, 'p2')
    state = pass(state, 'p3')

    // p1 won lot1 with $10, now has $0, should be opener for lot2 but can't afford $1
    // So it should skip to p2
    const result = placeBid(state, 'p2', 5)
    expect(result.lotStates['lot2'].status).toBe('active')
  })

  it('lot resolves immediately when opener bids and no one else can afford to raise', () => {
    let state = startAuction(
      makeBaseState({
        players: [
          makePlayer({ id: 'p1', name: 'Alice', balance: 1000 }),
          makePlayer({ id: 'p2', name: 'Bob', balance: 0 }),
          makePlayer({ id: 'p3', name: 'Charlie', balance: 0 }),
        ],
      })
    )

    // Only p1 can bid. Opening bid should immediately win
    state = placeBid(state, 'p1', 5)

    expect(state.lotStates['lot1']).toEqual({
      status: 'sold',
      winnerId: 'p1',
      finalBid: 5,
    })
  })
})

describe('UNDO action', () => {
  it('reverts to previous state', () => {
    let state = startAuction(makeBaseState())
    state = placeBid(state, 'p1', 10)

    const afterBid = state
    state = placeBid(state, 'p2', 20)

    state = applyAction(state, { type: 'UNDO' })

    const lotState = state.lotStates['lot1']
    if (lotState.status === 'active') {
      expect(lotState.currentBid.amount).toBe(10)
      expect(lotState.currentBid.playerId).toBe('p1')
    }
  })

  it('does nothing when no history', () => {
    const state = startAuction(makeBaseState())
    const result = applyAction(state, { type: 'UNDO' })
    expect(result.lotStates).toEqual(state.lotStates)
  })
})

describe('FORCE_ADVANCE action', () => {
  it('skips the current lot', () => {
    let state = startAuction(makeBaseState())
    state = applyAction(state, { type: 'FORCE_ADVANCE' })

    expect(state.lotStates['lot1']).toEqual({ status: 'skipped' })
    expect(state.currentLotIndex).toBe(1)
  })

  it('completes auction if it was the last lot', () => {
    let state = startAuction(
      makeBaseState({
        lots: [makeLot({ id: 'lot1' })],
        lotStates: { lot1: { status: 'pending' } },
      })
    )

    state = applyAction(state, { type: 'FORCE_ADVANCE' })
    expect(state.phase).toBe('complete')
  })
})

describe('PAUSE / RESUME', () => {
  it('pausing prevents bids', () => {
    let state = startAuction(makeBaseState())
    state = applyAction(state, { type: 'PAUSE' })
    expect(state.paused).toBe(true)

    const result = placeBid(state, 'p1', 10)
    expect(result.lotStates['lot1'].status).toBe('pending')
  })

  it('resuming allows bids again', () => {
    let state = startAuction(makeBaseState())
    state = applyAction(state, { type: 'PAUSE' })
    state = applyAction(state, { type: 'RESUME' })
    expect(state.paused).toBe(false)

    const result = placeBid(state, 'p1', 10)
    expect(result.lotStates['lot1'].status).toBe('active')
  })
})

describe('getEligibleBidders', () => {
  it('excludes passed players and those who cannot afford', () => {
    const state: AuctionState = {
      ...makeBaseState({ phase: 'active', currentLotIndex: 0 }),
      players: [
        makePlayer({ id: 'p1', name: 'Alice', balance: 1000 }),
        makePlayer({ id: 'p2', name: 'Bob', balance: 5 }),
        makePlayer({ id: 'p3', name: 'Charlie', balance: 1000 }),
      ],
      lotStates: {
        lot1: {
          status: 'active',
          currentBid: { playerId: 'p1', amount: 50, timestamp: 0 },
          passedPlayerIds: ['p3'],
          openerId: 'p1',
        },
        lot2: { status: 'pending' },
        lot3: { status: 'pending' },
      },
    }

    const eligible = getEligibleBidders(state)
    expect(eligible.map((p) => p.id)).toEqual(['p1'])
    // p2 can't afford 51, p3 passed
  })
})

describe('isLotOver', () => {
  it('returns true when only one eligible bidder remains', () => {
    const state: AuctionState = {
      ...makeBaseState({ phase: 'active', currentLotIndex: 0 }),
      lotStates: {
        lot1: {
          status: 'active',
          currentBid: { playerId: 'p1', amount: 50, timestamp: 0 },
          passedPlayerIds: ['p2', 'p3'],
          openerId: 'p1',
        },
        lot2: { status: 'pending' },
        lot3: { status: 'pending' },
      },
    }
    expect(isLotOver(state)).toBe(true)
  })

  it('returns false when multiple bidders remain', () => {
    const state: AuctionState = {
      ...makeBaseState({ phase: 'active', currentLotIndex: 0 }),
      lotStates: {
        lot1: {
          status: 'active',
          currentBid: { playerId: 'p1', amount: 50, timestamp: 0 },
          passedPlayerIds: [],
          openerId: 'p1',
        },
        lot2: { status: 'pending' },
        lot3: { status: 'pending' },
      },
    }
    expect(isLotOver(state)).toBe(false)
  })
})

describe('Full auction flow', () => {
  it('runs a complete 2-lot auction', () => {
    let state = startAuction(
      makeBaseState({
        lots: [makeLot({ id: 'lot1' }), makeLot({ id: 'lot2' })],
        lotStates: { lot1: { status: 'pending' }, lot2: { status: 'pending' } },
      })
    )

    // Lot 1: p1 opens, p2 raises, p3 and p1 pass, p2 wins at 20
    state = placeBid(state, 'p1', 10)
    state = placeBid(state, 'p2', 20)
    state = pass(state, 'p3')
    state = pass(state, 'p1')

    expect(state.lotStates['lot1']).toEqual({
      status: 'sold',
      winnerId: 'p2',
      finalBid: 20,
    })
    expect(state.currentLotIndex).toBe(1)
    expect(state.openerPlayerId).toBe('p2') // winner opens next

    // Lot 2: p2 opens, p3 raises, p1 and p2 pass, p3 wins at 15
    state = placeBid(state, 'p2', 5)
    state = placeBid(state, 'p3', 15)
    state = pass(state, 'p1')
    state = pass(state, 'p2')

    expect(state.lotStates['lot2']).toEqual({
      status: 'sold',
      winnerId: 'p3',
      finalBid: 15,
    })
    expect(state.phase).toBe('complete')

    // Verify balances
    expect(state.players.find((p) => p.id === 'p1')!.balance).toBe(1000)
    expect(state.players.find((p) => p.id === 'p2')!.balance).toBe(980)
    expect(state.players.find((p) => p.id === 'p3')!.balance).toBe(985)
  })
})

describe('canPlayerAffordBid', () => {
  it('returns true when player can afford minimum bid', () => {
    const state = makeBaseState({ phase: 'active', currentLotIndex: 0 })
    expect(canPlayerAffordBid(state, 'p1')).toBe(true)
  })

  it('returns false for nonexistent player', () => {
    const state = makeBaseState({ phase: 'active', currentLotIndex: 0 })
    expect(canPlayerAffordBid(state, 'nobody')).toBe(false)
  })
})
