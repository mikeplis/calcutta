export type Player = {
  id: string
  name: string
  balance: number
  lotsWon: string[] // lot IDs
}

export type Team = {
  name: string
  seed: number
  region: string
  logoUrl?: string
  record?: string
  conference?: string
  kenpomRank?: number
  kenpomAdjEM?: number
  isPlayIn?: boolean // true for both teams in a play-in matchup (First Four)
}

export type Lot = {
  id: string
  label: string // e.g. "East 16/15 Seeds" or "Duke"
  teams: Team[]
}

export type Bid = {
  playerId: string
  amount: number
  timestamp: number
}

export type LotAuctionState =
  | { status: 'pending'; currentTurnPlayerId?: string }
  | { status: 'active'; currentBid: Bid; passedPlayerIds: string[]; openerId: string }
  | { status: 'sold'; winnerId: string; finalBid: number }
  | { status: 'skipped' }

export type AuctionState = {
  auctionId: string
  name?: string
  players: Player[]
  lots: Lot[]
  lotStates: Record<string, LotAuctionState>
  currentLotIndex: number
  phase: 'setup' | 'active' | 'complete'
  openerPlayerId: string // who opens the current lot
  adminId: string
  stateHistory: AuctionState[] // for undo support
  paused: boolean
  claimedPlayers: Record<string, string> // playerId → sessionToken
  testMode: boolean
}

// Discriminated union of all auction actions
export type AuctionAction =
  | { type: 'START_AUCTION' }
  | { type: 'PLACE_BID'; playerId: string; amount: number }
  | { type: 'PASS'; playerId: string }
  | { type: 'UNDO' }
  | { type: 'FORCE_ADVANCE' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'FORCE_SELL'; winnerId: string; amount: number }
