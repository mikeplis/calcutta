import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LocalAuctionService } from './LocalAuctionService'
import type { AuctionState } from '../domain/types'

const STORAGE_KEY = 'calcutta-auction-state'

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
  beforeEach(() => {
    localStorage.clear()
  })

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

    await service.dispatch({ type: 'PLACE_BID', playerId: 'p2', amount: 20 })
    await service.dispatch({ type: 'UNDO' })

    const lotState = service.getState().lotStates['lot1']
    if (lotState.status === 'active') {
      expect(lotState.currentBid.amount).toBe(10)
    }
  })

  it('persists state to localStorage when persistence is enabled', async () => {
    const service = new LocalAuctionService(makeTestState(), false)
    await service.dispatch({ type: 'START_AUCTION' })
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()

    service.enablePersistence()
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.phase).toBe('active')
  })

  it('persists on every dispatch after enablePersistence', async () => {
    const service = new LocalAuctionService(makeTestState(), false)
    await service.dispatch({ type: 'START_AUCTION' })
    service.enablePersistence()

    await service.dispatch({ type: 'PLACE_BID', playerId: 'p1', amount: 10 })
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    const lotState = saved.lotStates['lot1']
    expect(lotState.status).toBe('active')
    expect(lotState.currentBid.amount).toBe(10)
  })

  it('does not persist when persistence is disabled', async () => {
    const service = new LocalAuctionService(makeTestState(), false)
    await service.dispatch({ type: 'START_AUCTION' })
    await service.dispatch({ type: 'PLACE_BID', playerId: 'p1', amount: 10 })
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('clearStorage removes saved state', async () => {
    const service = new LocalAuctionService(makeTestState(), false)
    await service.dispatch({ type: 'START_AUCTION' })
    service.enablePersistence()
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()

    service.clearStorage()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('loadSaved returns service from localStorage for active auction', async () => {
    const service = new LocalAuctionService(makeTestState(), false)
    await service.dispatch({ type: 'START_AUCTION' })
    await service.dispatch({ type: 'PLACE_BID', playerId: 'p1', amount: 10 })
    service.enablePersistence()

    const restored = LocalAuctionService.loadSaved()
    expect(restored).not.toBeNull()
    const state = restored!.getState()
    expect(state.phase).toBe('active')
    const lotState = state.lotStates['lot1']
    if (lotState.status === 'active') {
      expect(lotState.currentBid.amount).toBe(10)
    }
  })

  it('loadSaved returns service for complete auction', async () => {
    const service = new LocalAuctionService(makeTestState(), false)
    await service.dispatch({ type: 'START_AUCTION' })
    await service.dispatch({ type: 'PLACE_BID', playerId: 'p1', amount: 10 })
    await service.dispatch({ type: 'PASS', playerId: 'p2' })
    await service.dispatch({ type: 'PASS', playerId: 'p3' })
    await service.dispatch({ type: 'PLACE_BID', playerId: 'p1', amount: 5 })
    await service.dispatch({ type: 'PASS', playerId: 'p2' })
    await service.dispatch({ type: 'PASS', playerId: 'p3' })
    service.enablePersistence()

    const restored = LocalAuctionService.loadSaved()
    expect(restored).not.toBeNull()
    expect(restored!.getState().phase).toBe('complete')
  })

  it('loadSaved returns null when nothing is saved', () => {
    expect(LocalAuctionService.loadSaved()).toBeNull()
  })

  it('loadSaved returns null for setup-phase state', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(makeTestState()))
    expect(LocalAuctionService.loadSaved()).toBeNull()
  })

  it('loadSaved service continues to persist on subsequent dispatches', async () => {
    const service = new LocalAuctionService(makeTestState(), false)
    await service.dispatch({ type: 'START_AUCTION' })
    service.enablePersistence()

    const restored = LocalAuctionService.loadSaved()
    expect(restored).not.toBeNull()

    // Dispatch an action on the restored service
    await restored!.dispatch({ type: 'PLACE_BID', playerId: 'p1', amount: 15 })

    // Verify it persisted the new state
    const savedRaw = localStorage.getItem(STORAGE_KEY)
    expect(savedRaw).not.toBeNull()
    const saved = JSON.parse(savedRaw!)
    const lotState = saved.lotStates['lot1']
    expect(lotState.status).toBe('active')
    expect(lotState.currentBid.amount).toBe(15)
  })

  it('new service with persist=false ignores existing localStorage', async () => {
    // Simulate a previous auction saved in storage
    const oldService = new LocalAuctionService(makeTestState(), false)
    await oldService.dispatch({ type: 'START_AUCTION' })
    await oldService.dispatch({ type: 'PLACE_BID', playerId: 'p1', amount: 99 })
    oldService.enablePersistence()

    // Create a fresh service without persistence — should use initialState, not saved
    const freshState = makeTestState({ auctionId: 'fresh' })
    const freshService = new LocalAuctionService(freshState, false)
    expect(freshService.getState().auctionId).toBe('fresh')
    expect(freshService.getState().phase).toBe('setup')
  })
})
