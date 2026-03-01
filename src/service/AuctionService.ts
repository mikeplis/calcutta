import type { AuctionState, AuctionAction } from '../domain/types'

export interface AuctionService {
  getState(): AuctionState
  subscribe(callback: (state: AuctionState) => void): () => void
  dispatch(action: AuctionAction): Promise<void>
}
