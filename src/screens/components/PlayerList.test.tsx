import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { PlayerList } from './PlayerList'
import { makeBaseState, makePlayer } from '../../test-helpers'
import type { AuctionState } from '../../domain/types'

function makeActiveState(overrides?: Partial<AuctionState>): AuctionState {
  return makeBaseState({
    phase: 'active',
    lotStates: {
      lot1: {
        status: 'active',
        currentBid: { playerId: 'p1', amount: 10, timestamp: 0 },
        passedPlayerIds: [],
        openerId: 'p1',
      },
      lot2: { status: 'pending' },
      lot3: { status: 'pending' },
    },
    ...overrides,
  })
}

describe('PlayerList', () => {
  it('shows BIDDING badge on the active player', () => {
    const state = makeActiveState()
    const { getByText } = render(<PlayerList state={state} />)
    expect(getByText('BIDDING')).toBeInTheDocument()
  })

  it('shows HIGH BID badge on current bid holder when not their turn', () => {
    // p1 has the current bid, but p2 is the active turn player
    const state = makeActiveState()
    const { getByText } = render(<PlayerList state={state} />)
    expect(getByText('HIGH BID')).toBeInTheDocument()
  })

  it('shows PASSED badge and strikethrough on passed players', () => {
    const state = makeActiveState({
      lotStates: {
        lot1: {
          status: 'active',
          currentBid: { playerId: 'p1', amount: 10, timestamp: 0 },
          passedPlayerIds: ['p2'],
          openerId: 'p1',
        },
        lot2: { status: 'pending' },
        lot3: { status: 'pending' },
      },
    })
    const { getByText } = render(<PlayerList state={state} />)
    expect(getByText('PASSED')).toBeInTheDocument()

    // Bob's name should have line-through class
    const bobName = getByText('Bob')
    expect(bobName).toHaveClass('line-through')
  })

  it('shows low balance warning styling', () => {
    // Max starting balance = 1000 (from defaults). Threshold = 200.
    // Give p1 a balance below 200.
    const state = makeActiveState({
      players: [
        makePlayer({ id: 'p1', name: 'Alice', balance: 100 }),
        makePlayer({ id: 'p2', name: 'Bob', balance: 1000 }),
        makePlayer({ id: 'p3', name: 'Charlie', balance: 1000 }),
      ],
    })
    const { getByText } = render(<PlayerList state={state} />)
    expect(getByText('$100')).toHaveClass('text-red-600')
  })

  it('does not show low balance warning for players above threshold', () => {
    const state = makeActiveState()
    const { getAllByText } = render(<PlayerList state={state} />)
    // All players have $1000, threshold is $200 → none should be red
    const balanceElements = getAllByText('$1000', { exact: false })
    balanceElements.forEach((el) => {
      expect(el).not.toHaveClass('text-red-600')
    })
  })
})
