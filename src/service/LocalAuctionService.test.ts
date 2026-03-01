import { describe, it, expect, vi } from 'vitest'
import { LocalAuctionService } from './LocalAuctionService'
import type { AuctionState } from '../domain/types'

function makeTestState(overrides?: Partial<AuctionState>): AuctionState {
  return {
    auctionId: 'test',
    players: [
      { id: 'p1', name: 'Alice', balance: 1000, lotsWon: [] },
      { id: 'p2', name: 'Bob', balance: 1000, lotsWon: [] },
      { id: 'p3', name: 'Charlie', balance: 1000, lotsWon: [] },
    ],
    lots: [
      { id: 'lot1', label: 'Lot 1', teams: [{ name: 'Team A', seed: 1, region: 'East' }] },
      { id: 'lot2', label: 'Lot 2', teams: [{ name: 'Team B', seed: 2, region: 'East' }] },
    ],
    lotStates: { lot1: { status: 'pending' }, lot2: { status: 'pending' } },
    currentLotIndex: 0,
    phase: 'setup',
    openerPlayerId: 'p1',
    adminId: 'admin',
    stateHistory: [],
    paused: false,
    ...overrides,
  }
}

describe('LocalAuctionService', () => {
  it('returns initial state from getState', () => {
    const initial = makeTestState()
    const service = new LocalAuctionService(initial, false)
    expect(service.getState()).toEqual(initial)
  })

  it('updates state via dispatch', async () => {
    const service = new LocalAuctionService(makeTestState(), false)
    await service.dispatch({ type: 'START_AUCTION' })
    expect(service.getState().phase).toBe('active')
  })

  it('notifies subscribers on dispatch', async () => {
    const service = new LocalAuctionService(makeTestState(), false)
    const listener = vi.fn()
    service.subscribe(listener)

    await service.dispatch({ type: 'START_AUCTION' })
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ phase: 'active' })
    )
  })

  it('unsubscribe stops notifications', async () => {
    const service = new LocalAuctionService(makeTestState(), false)
    const listener = vi.fn()
    const unsubscribe = service.subscribe(listener)

    unsubscribe()
    await service.dispatch({ type: 'START_AUCTION' })
    expect(listener).not.toHaveBeenCalled()
  })

  it('runs a full auction through the service', async () => {
    const service = new LocalAuctionService(makeTestState(), false)
    await service.dispatch({ type: 'START_AUCTION' })

    // Lot 1
    await service.dispatch({ type: 'PLACE_BID', playerId: 'p1', amount: 10 })
    await service.dispatch({ type: 'PASS', playerId: 'p2' })
    await service.dispatch({ type: 'PASS', playerId: 'p3' })

    const state1 = service.getState()
    expect(state1.lotStates['lot1']).toEqual({
      status: 'sold',
      winnerId: 'p1',
      finalBid: 10,
    })
    expect(state1.currentLotIndex).toBe(1)

    // Lot 2
    await service.dispatch({ type: 'PLACE_BID', playerId: 'p1', amount: 5 })
    await service.dispatch({ type: 'PASS', playerId: 'p2' })
    await service.dispatch({ type: 'PASS', playerId: 'p3' })

    const state2 = service.getState()
    expect(state2.phase).toBe('complete')
    expect(state2.lotStates['lot2']).toEqual({
      status: 'sold',
      winnerId: 'p1',
      finalBid: 5,
    })
  })

  it('supports undo through the service', async () => {
    const service = new LocalAuctionService(makeTestState(), false)
    await service.dispatch({ type: 'START_AUCTION' })
    await service.dispatch({ type: 'PLACE_BID', playerId: 'p1', amount: 10 })

    const stateAfterBid = service.getState()
    await service.dispatch({ type: 'PLACE_BID', playerId: 'p2', amount: 20 })
    await service.dispatch({ type: 'UNDO' })

    const lotState = service.getState().lotStates['lot1']
    if (lotState.status === 'active') {
      expect(lotState.currentBid.amount).toBe(10)
    }
  })
})
