import type { AuctionState, AuctionAction } from '../domain/types'
import type { AuctionService } from './AuctionService'
import { applyAction } from '../domain/logic'

const STORAGE_KEY = 'calcutta-auction-state'

export class LocalAuctionService implements AuctionService {
  private state: AuctionState
  private listeners = new Set<(state: AuctionState) => void>()
  private persist: boolean

  constructor(initialState: AuctionState, persist = true) {
    this.persist = persist
    const saved = persist ? this.loadFromStorage() : null
    this.state = saved ?? initialState
  }

  getState(): AuctionState {
    return this.state
  }

  subscribe(callback: (state: AuctionState) => void): () => void {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

  async dispatch(action: AuctionAction): Promise<void> {
    this.state = applyAction(this.state, action)
    if (this.persist) {
      this.saveToStorage()
    }
    this.notifyListeners()
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.state)
    }
  }

  private loadFromStorage(): AuctionState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      return JSON.parse(raw) as AuctionState
    } catch {
      return null
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state))
    } catch {
      // Storage full or unavailable — continue without persistence
    }
  }

  static loadSaved(): LocalAuctionService | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      const saved = JSON.parse(raw) as AuctionState
      if (saved.phase !== 'active' && saved.phase !== 'complete') return null
      // Create a placeholder initial state — it won't be used since persist=true
      // will load from storage
      return new LocalAuctionService(saved)
    } catch {
      return null
    }
  }

  enablePersistence(): void {
    this.persist = true
    this.saveToStorage()
  }

  clearStorage(): void {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore
    }
  }
}
