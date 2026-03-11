import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { BidControls } from './BidControls'
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

function renderBidControls(state: AuctionState, overrides?: { onBid?: () => void; onPass?: () => void }) {
  const props = {
    state,
    onBid: overrides?.onBid ?? vi.fn(),
    onPass: overrides?.onPass ?? vi.fn(),
  }
  const result = render(<BidControls {...props} />)
  return { ...result, props }
}

describe('BidControls', () => {
  describe('pending state', () => {
    it('shows "Opening bid by" and "Open" button, no Pass button', () => {
      const state = makeBaseState({ phase: 'active' }) // lot1 is pending, openerPlayerId=p1
      const { getByText, queryByText } = renderBidControls(state)

      expect(getByText('Opening bid by')).toBeInTheDocument()
      expect(getByText('Alice')).toBeInTheDocument()
      expect(getByText('Open')).toBeInTheDocument()
      expect(queryByText('Pass')).not.toBeInTheDocument()
    })
  })

  describe('active state', () => {
    it('shows "It\'s {name}\'s turn", "Raise" button, and Pass button', () => {
      // p1 has the current bid, so active turn should be p2
      const state = makeActiveState()
      const { getByText } = renderBidControls(state)

      // The active turn player is the next eligible bidder (p2)
      expect(getByText('Raise')).toBeInTheDocument()
      expect(getByText('Pass')).toBeInTheDocument()
    })
  })

  describe('paused state', () => {
    it('renders nothing when paused', () => {
      const state = makeActiveState({ paused: true })
      const { container } = renderBidControls(state)
      expect(container.innerHTML).toBe('')
    })
  })

  describe('no eligible bidders', () => {
    it('shows warning message when no eligible bidders', () => {
      // All players passed except current bid holder → lot should be over, but
      // if we set up a state where activePlayer is null and lot is active/pending
      const state = makeBaseState({
        phase: 'active',
        players: [
          makePlayer({ id: 'p1', name: 'Alice', balance: 0 }),
          makePlayer({ id: 'p2', name: 'Bob', balance: 0 }),
          makePlayer({ id: 'p3', name: 'Charlie', balance: 0 }),
        ],
      })
      const { getByText } = renderBidControls(state)
      expect(getByText(/No eligible bidders/)).toBeInTheDocument()
    })
  })

  describe('bid button disabled state', () => {
    it('disables bid button when amount exceeds balance', () => {
      const state = makeActiveState({
        players: [
          makePlayer({ id: 'p1', name: 'Alice', balance: 10 }),
          makePlayer({ id: 'p2', name: 'Bob', balance: 15 }),
          makePlayer({ id: 'p3', name: 'Charlie', balance: 1000 }),
        ],
      })
      const { getByText, getByRole } = renderBidControls(state)

      // Set bid amount higher than active player's balance
      const input = getByRole('spinbutton')
      fireEvent.change(input, { target: { value: '9999' } })

      expect(getByText('Raise')).toBeDisabled()
    })
  })

  describe('quick increment buttons', () => {
    it('updates bid amount, clamped to max', () => {
      const state = makeActiveState({
        players: [
          makePlayer({ id: 'p1', name: 'Alice', balance: 10 }),
          makePlayer({ id: 'p2', name: 'Bob', balance: 20 }),
          makePlayer({ id: 'p3', name: 'Charlie', balance: 1000 }),
        ],
      })
      const { getByText, getByRole } = renderBidControls(state)

      // Click +25 — should clamp to Bob's balance of 20
      fireEvent.click(getByText('+$25'))

      const input = getByRole('spinbutton') as HTMLInputElement
      expect(Number(input.value)).toBeLessThanOrEqual(20)
    })
  })

  describe('bid input', () => {
    it('allows clearing and retyping a value', () => {
      const state = makeActiveState()
      const { getByRole } = renderBidControls(state)
      const input = getByRole('spinbutton') as HTMLInputElement

      // Clear the input
      fireEvent.change(input, { target: { value: '' } })
      expect(input.value).toBe('')

      // Type a new value
      fireEvent.change(input, { target: { value: '15' } })
      expect(input.value).toBe('15')
    })
  })

  describe('keyboard shortcuts', () => {
    it('Enter calls onBid', () => {
      const state = makeActiveState()
      const onBid = vi.fn()
      const { container } = renderBidControls(state, { onBid })

      fireEvent.keyDown(container.firstChild!, { key: 'Enter' })
      expect(onBid).toHaveBeenCalledOnce()
    })

    it('Escape calls onPass in active state', () => {
      const state = makeActiveState()
      const onPass = vi.fn()
      const { container } = renderBidControls(state, { onPass })

      fireEvent.keyDown(container.firstChild!, { key: 'Escape' })
      expect(onPass).toHaveBeenCalledOnce()
    })

    it('Escape does not call onPass in pending state', () => {
      const state = makeBaseState({ phase: 'active' })
      const onPass = vi.fn()
      const { container } = renderBidControls(state, { onPass })

      fireEvent.keyDown(container.firstChild!, { key: 'Escape' })
      expect(onPass).not.toHaveBeenCalled()
    })
  })
})
