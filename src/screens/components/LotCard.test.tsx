import { describe, it, expect } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { LotCard } from './LotCard'
import { makeBaseState } from '../../test-helpers'
import type { AuctionState } from '../../domain/types'

function makeActiveState(overrides?: Partial<AuctionState>): AuctionState {
  return makeBaseState({
    phase: 'active',
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
    ...overrides,
  })
}

describe('LotCard', () => {
  describe('pending state', () => {
    it('shows AWAITING OPEN badge and placeholder bid area', () => {
      const state = makeBaseState({ phase: 'active' })
      const { getByText } = render(<LotCard state={state} />)

      expect(getByText('AWAITING OPEN')).toBeInTheDocument()
      expect(getByText('Waiting for opening bid')).toBeInTheDocument()
      expect(getByText('—')).toBeInTheDocument()
    })
  })

  describe('active state', () => {
    it('shows LIVE badge and current high bid', () => {
      const state = makeActiveState()
      const { getByText } = render(<LotCard state={state} />)

      expect(getByText('LIVE')).toBeInTheDocument()
      expect(getByText('$50')).toBeInTheDocument()
      expect(getByText('Current High Bid')).toBeInTheDocument()
    })
  })

  describe('paused indicator', () => {
    it('shows PAUSED when state.paused is true', () => {
      const state = makeActiveState({ paused: true })
      const { getByText } = render(<LotCard state={state} />)
      expect(getByText('PAUSED')).toBeInTheDocument()
    })
  })

  describe('sold overlay', () => {
    it('shows sold info when soldInfo is provided', () => {
      const state = makeActiveState()
      const soldInfo = { winner: 'Alice', amount: 50, lotLabel: 'Lot 1' }
      const { getByText } = render(<LotCard state={state} soldInfo={soldInfo} />)

      expect(getByText('SOLD')).toBeInTheDocument()
      // The overlay contains winner and amount
      const overlay = getByText('SOLD').closest('[class*="absolute"]')!
      expect(overlay).toHaveTextContent('Alice')
      expect(overlay).toHaveTextContent('$50')
    })

    it('click starts dismiss animation', () => {
      const state = makeActiveState()
      const soldInfo = { winner: 'Alice', amount: 50, lotLabel: 'Lot 1' }
      const { getByText } = render(
        <LotCard state={state} soldInfo={soldInfo} />,
      )

      fireEvent.click(getByText('SOLD').closest('[class*="absolute"]')!)

      const overlay = getByText('SOLD').closest('[class*="absolute"]')!
      expect(overlay).toHaveClass('animate-fade-out')
    })

    it('clearing soldInfo starts dismiss animation', () => {
      const state = makeActiveState()
      const soldInfo = { winner: 'Alice', amount: 50, lotLabel: 'Lot 1' }
      const { getByText, rerender } = render(
        <LotCard state={state} soldInfo={soldInfo} />,
      )

      // Clear soldInfo to trigger the effect-based fade-out
      rerender(<LotCard state={state} />)

      const overlay = getByText('SOLD').closest('[class*="absolute"]')!
      expect(overlay).toHaveClass('animate-fade-out')
    })
  })

  it('shows lot number and total lots', () => {
    const state = makeBaseState({ phase: 'active', currentLotIndex: 1 })
    const { getByText } = render(<LotCard state={state} />)
    expect(getByText('Lot 2 of 3')).toBeInTheDocument()
  })
})
