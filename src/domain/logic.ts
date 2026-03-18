import type { AuctionState, AuctionAction, LotAuctionState, Player } from './types'

export const MAX_UNDO_DEPTH = 50

export function getCurrentLot(state: AuctionState) {
  return state.lots[state.currentLotIndex] ?? null
}

export function getCurrentLotState(state: AuctionState): LotAuctionState | null {
  const lot = getCurrentLot(state)
  if (!lot) return null
  return state.lotStates[lot.id] ?? { status: 'pending' }
}

export function getPlayerById(state: AuctionState, playerId: string): Player | undefined {
  return state.players.find((p) => p.id === playerId)
}

export function getMinimumBid(state: AuctionState): number {
  const lotState = getCurrentLotState(state)
  if (!lotState) return 1
  if (lotState.status === 'active') {
    return lotState.currentBid.amount + 1
  }
  return 1 // opening bid minimum
}

export function canPlayerAffordBid(state: AuctionState, playerId: string): boolean {
  const player = getPlayerById(state, playerId)
  if (!player) return false
  return player.balance >= getMinimumBid(state)
}

export function getEligibleBidders(state: AuctionState): Player[] {
  const lotState = getCurrentLotState(state)
  if (!lotState || lotState.status !== 'active') return []

  const minBid = lotState.currentBid.amount + 1
  return state.players.filter(
    (p) => !lotState.passedPlayerIds.includes(p.id) && p.balance >= minBid
  )
}

export function getNextBidder(state: AuctionState, currentBidderId: string): Player | null {
  const lotState = getCurrentLotState(state)
  if (!lotState || lotState.status !== 'active') return null

  const minBid = lotState.currentBid.amount + 1
  const playerCount = state.players.length
  const currentIndex = state.players.findIndex((p) => p.id === currentBidderId)
  if (currentIndex === -1) return null

  // Walk clockwise through players looking for someone eligible
  for (let i = 1; i < playerCount; i++) {
    const nextIndex = (currentIndex + i) % playerCount
    const candidate = state.players[nextIndex]
    if (!lotState.passedPlayerIds.includes(candidate.id) && candidate.balance >= minBid) {
      return candidate
    }
  }
  return null
}

export function isLotOver(state: AuctionState): boolean {
  const lotState = getCurrentLotState(state)
  if (!lotState || lotState.status !== 'active') return false
  return getEligibleBidders(state).length <= 1
}

export function getActivePlayerTurn(state: AuctionState): Player | null {
  const lotState = getCurrentLotState(state)
  if (!lotState || lotState.status !== 'active') return null

  // If lot is over, no one's turn
  const eligible = getEligibleBidders(state)
  if (eligible.length <= 1) return null

  // The next bidder after the current high bidder
  return getNextBidder(state, lotState.currentBid.playerId)
}

export function isValidBid(state: AuctionState, playerId: string, amount: number): boolean {
  if (state.phase !== 'active') return false
  const lotState = getCurrentLotState(state)
  if (!lotState) return false

  const player = getPlayerById(state, playerId)
  if (!player) return false

  if (lotState.status === 'pending') {
    const turnPlayer = getPendingTurnPlayer(state)
    if (!turnPlayer || playerId !== turnPlayer.id) return false
    return amount >= 1 && amount <= player.balance
  }

  if (lotState.status !== 'active') return false

  // Player must not have passed
  if (lotState.passedPlayerIds.includes(playerId)) return false

  // Must be this player's turn
  const activePlayer = getActivePlayerTurn(state)
  if (!activePlayer || activePlayer.id !== playerId) {
    // Special case: if this is the opener's first bid (opener is the current bidder
    // and there's no next bidder yet because it was just opened), we need to check differently
    // Actually, the opener places the first bid which transitions from pending to active
    // So if it's active, turns are determined by getActivePlayerTurn
    return false
  }

  const minBid = lotState.currentBid.amount + 1
  return amount >= minBid && amount <= player.balance
}

function findNextOpener(state: AuctionState, winnerId: string): string {
  // The winner opens next. If they can't afford $1, find next player clockwise who can
  const winnerIndex = state.players.findIndex((p) => p.id === winnerId)
  const playerCount = state.players.length

  for (let i = 0; i < playerCount; i++) {
    const index = (winnerIndex + i) % playerCount
    const player = state.players[index]
    if (player.balance >= 1) return player.id
  }

  // Fallback — shouldn't happen in practice
  return state.players[0].id
}

function resolveLot(state: AuctionState): AuctionState {
  const lot = getCurrentLot(state)
  if (!lot) return state
  const lotState = getCurrentLotState(state)
  if (!lotState || lotState.status !== 'active') return state

  const eligible = getEligibleBidders(state)

  // If one or zero eligible remain, the current high bidder wins
  if (eligible.length > 1) return state

  const winnerId = lotState.currentBid.playerId
  const finalBid = lotState.currentBid.amount

  const newPlayers = state.players.map((p) =>
    p.id === winnerId
      ? { ...p, balance: p.balance - finalBid, lotsWon: [...p.lotsWon, lot.id] }
      : p
  )

  const newLotStates = {
    ...state.lotStates,
    [lot.id]: { status: 'sold' as const, winnerId, finalBid },
  }

  // Check if there are more lots
  const nextLotIndex = state.currentLotIndex + 1
  const isComplete = nextLotIndex >= state.lots.length

  // Find the opener for the next lot using updated balances
  const stateWithUpdatedBalances = { ...state, players: newPlayers }
  const nextOpener = isComplete
    ? winnerId
    : findNextOpener(stateWithUpdatedBalances, winnerId)

  return {
    ...state,
    players: newPlayers,
    lotStates: newLotStates,
    currentLotIndex: nextLotIndex,
    phase: isComplete ? 'complete' : 'active',
    openerPlayerId: nextOpener,
    stateHistory: state.stateHistory, // keep as is, managed by applyAction
    paused: state.paused,
  }
}

export function getPendingTurnPlayer(state: AuctionState): Player | null {
  const lotState = getCurrentLotState(state)
  if (!lotState || lotState.status !== 'pending') return null
  const turnPlayerId = lotState.currentTurnPlayerId ?? findEligibleOpener(state)
  if (!turnPlayerId) return null
  return getPlayerById(state, turnPlayerId) ?? null
}

export function findEligibleOpener(state: AuctionState): string | null {
  const openerIndex = state.players.findIndex((p) => p.id === state.openerPlayerId)
  const playerCount = state.players.length

  for (let i = 0; i < playerCount; i++) {
    const index = (openerIndex + i) % playerCount
    const player = state.players[index]
    if (player.balance >= 1) return player.id
  }
  return null
}

export function applyAction(state: AuctionState, action: AuctionAction): AuctionState {
  switch (action.type) {
    case 'START_AUCTION': {
      if (state.phase !== 'setup') return state
      if (state.players.length < 2 || state.lots.length < 1) return state

      const lotStates: Record<string, LotAuctionState> = {}
      for (const lot of state.lots) {
        lotStates[lot.id] = { status: 'pending' }
      }

      return {
        ...state,
        phase: 'active',
        currentLotIndex: 0,
        lotStates,
        stateHistory: [],
        paused: false,
        claimedPlayers: {},
      }
    }

    case 'PLACE_BID': {
      if (state.phase !== 'active' || state.paused) return state
      const lot = getCurrentLot(state)
      if (!lot) return state
      const lotState = getCurrentLotState(state)
      if (!lotState) return state

      const player = getPlayerById(state, action.playerId)
      if (!player) return state

      // Save state for undo (without the stateHistory to avoid deep nesting)
      const stateForHistory = { ...state, stateHistory: [] }

      if (lotState.status === 'pending') {
        // Opening bid
        const turnPlayer = getPendingTurnPlayer(state)
        if (!turnPlayer || action.playerId !== turnPlayer.id) return state
        if (action.amount < 1 || action.amount > player.balance) return state

        const bid = { playerId: action.playerId, amount: action.amount, timestamp: Date.now() }
        const newLotStates = {
          ...state.lotStates,
          [lot.id]: {
            status: 'active' as const,
            currentBid: bid,
            passedPlayerIds: [],
            openerId: action.playerId,
          },
        }

        const newState: AuctionState = {
          ...state,
          lotStates: newLotStates,
          openerPlayerId: turnPlayer.id,
          stateHistory: [...state.stateHistory, stateForHistory].slice(-MAX_UNDO_DEPTH),
        }

        // Check if lot is immediately over (only one player can afford to raise)
        if (isLotOver(newState)) {
          return resolveLot(newState)
        }
        return newState
      }

      if (lotState.status !== 'active') return state

      // Validate it's this player's turn
      if (!isValidBid(state, action.playerId, action.amount)) return state

      const bid = { playerId: action.playerId, amount: action.amount, timestamp: Date.now() }
      const newLotStates = {
        ...state.lotStates,
        [lot.id]: {
          ...lotState,
          currentBid: bid,
        },
      }

      const newState: AuctionState = {
        ...state,
        lotStates: newLotStates,
        stateHistory: [...state.stateHistory, stateForHistory].slice(-MAX_UNDO_DEPTH),
      }

      // Auto-resolve if lot is over
      if (isLotOver(newState)) {
        return resolveLot(newState)
      }
      return newState
    }

    case 'PASS': {
      if (state.phase !== 'active' || state.paused) return state
      const lot = getCurrentLot(state)
      if (!lot) return state
      const lotState = getCurrentLotState(state)
      if (!lotState) return state

      const player = getPlayerById(state, action.playerId)
      if (!player) return state

      if (lotState.status === 'pending') {
        const turnPlayer = getPendingTurnPlayer(state)
        if (!turnPlayer || action.playerId !== turnPlayer.id) return state

        // Find next player clockwise with enough balance for a $1 bid
        const currentIndex = state.players.findIndex((p) => p.id === turnPlayer.id)
        let nextPlayer: Player | null = null
        for (let i = 1; i < state.players.length; i++) {
          const candidate = state.players[(currentIndex + i) % state.players.length]
          if (candidate.balance >= 1) { nextPlayer = candidate; break }
        }
        if (!nextPlayer) return state // no one can afford a bid — admin must skip

        const stateForHistory = { ...state, stateHistory: [] }
        const newLotStates = {
          ...state.lotStates,
          [lot.id]: { status: 'pending' as const, currentTurnPlayerId: nextPlayer.id },
        }
        return {
          ...state,
          lotStates: newLotStates,
          stateHistory: [...state.stateHistory, stateForHistory].slice(-MAX_UNDO_DEPTH),
        }
      }

      if (lotState.status !== 'active') return state

      // Verify it's this player's turn
      const activePlayer = getActivePlayerTurn(state)
      if (!activePlayer || activePlayer.id !== action.playerId) return state

      // Player already passed
      if (lotState.passedPlayerIds.includes(action.playerId)) return state

      const stateForHistory = { ...state, stateHistory: [] }

      const newLotStates = {
        ...state.lotStates,
        [lot.id]: {
          ...lotState,
          passedPlayerIds: [...lotState.passedPlayerIds, action.playerId],
        },
      }

      const newState: AuctionState = {
        ...state,
        lotStates: newLotStates,
        stateHistory: [...state.stateHistory, stateForHistory].slice(-MAX_UNDO_DEPTH),
      }

      // Check if lot is over after this pass
      if (isLotOver(newState)) {
        return resolveLot(newState)
      }
      return newState
    }

    case 'UNDO': {
      if (state.stateHistory.length === 0) return state
      const previousState = state.stateHistory[state.stateHistory.length - 1]
      // Restore with the history minus the last entry, preserving current player claims
      return {
        ...previousState,
        stateHistory: state.stateHistory.slice(0, -1),
        claimedPlayers: state.claimedPlayers,
      }
    }

    case 'FORCE_ADVANCE': {
      if (state.phase !== 'active') return state
      const lot = getCurrentLot(state)
      if (!lot) return state

      const stateForHistory = { ...state, stateHistory: [] }

      const newLotStates = {
        ...state.lotStates,
        [lot.id]: { status: 'skipped' as const },
      }

      const nextLotIndex = state.currentLotIndex + 1
      const isComplete = nextLotIndex >= state.lots.length

      return {
        ...state,
        lotStates: newLotStates,
        currentLotIndex: nextLotIndex,
        phase: isComplete ? 'complete' : 'active',
        stateHistory: [...state.stateHistory, stateForHistory].slice(-MAX_UNDO_DEPTH),
      }
    }

    case 'FORCE_SELL': {
      if (state.phase !== 'active') return state
      const lot = getCurrentLot(state)
      if (!lot) return state

      const winner = getPlayerById(state, action.winnerId)
      if (!winner || winner.balance < action.amount || action.amount < 0) return state

      const stateForHistory = { ...state, stateHistory: [] }

      const newPlayers = state.players.map((p) =>
        p.id === action.winnerId
          ? { ...p, balance: p.balance - action.amount, lotsWon: [...p.lotsWon, lot.id] }
          : p
      )

      const newLotStates = {
        ...state.lotStates,
        [lot.id]: { status: 'sold' as const, winnerId: action.winnerId, finalBid: action.amount },
      }

      const nextLotIndex = state.currentLotIndex + 1
      const isComplete = nextLotIndex >= state.lots.length
      const stateWithUpdatedBalances = { ...state, players: newPlayers }
      const nextOpener = isComplete
        ? action.winnerId
        : findNextOpener(stateWithUpdatedBalances, action.winnerId)

      return {
        ...state,
        players: newPlayers,
        lotStates: newLotStates,
        currentLotIndex: nextLotIndex,
        phase: isComplete ? 'complete' : 'active',
        openerPlayerId: nextOpener,
        stateHistory: [...state.stateHistory, stateForHistory].slice(-MAX_UNDO_DEPTH),
      }
    }

    case 'PAUSE': {
      return { ...state, paused: true }
    }

    case 'RESUME': {
      return { ...state, paused: false }
    }


    default:
      return state
  }
}
