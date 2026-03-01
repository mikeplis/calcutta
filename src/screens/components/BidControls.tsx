import { useState, useEffect } from 'react'
import type { AuctionState } from '../../domain/types'
import { getMinimumBid, getActivePlayerTurn, getCurrentLotState } from '../../domain/logic'

type Props = {
  state: AuctionState
  onBid: (playerId: string, amount: number) => void
  onPass: (playerId: string) => void
}

export function BidControls({ state, onBid, onPass }: Props) {
  const lotState = getCurrentLotState(state)
  const minBid = getMinimumBid(state)
  const [bidAmount, setBidAmount] = useState(minBid)

  const isPending = lotState?.status === 'pending'
  const isActive = lotState?.status === 'active'

  // Determine who can act
  let activePlayerId: string | null = null
  if (isPending) {
    // The opener (or eligible opener if original can't afford) needs to bid
    activePlayerId = state.openerPlayerId
    // Check if opener can afford — if not, find next
    const opener = state.players.find((p) => p.id === state.openerPlayerId)
    if (!opener || opener.balance < 1) {
      // Find next eligible
      const openerIndex = state.players.findIndex((p) => p.id === state.openerPlayerId)
      for (let i = 1; i < state.players.length; i++) {
        const idx = (openerIndex + i) % state.players.length
        if (state.players[idx].balance >= 1) {
          activePlayerId = state.players[idx].id
          break
        }
      }
    }
  } else if (isActive) {
    const turn = getActivePlayerTurn(state)
    activePlayerId = turn?.id ?? null
  }

  const activePlayer = state.players.find((p) => p.id === activePlayerId)

  // Update bid amount when minimum changes
  useEffect(() => {
    setBidAmount(minBid)
  }, [minBid])

  if (!activePlayer || state.paused) return null

  const maxBid = activePlayer.balance

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="text-center mb-3">
        <span className="text-sm text-gray-500">
          {isPending ? 'Opening bid by' : "It's"}{' '}
        </span>
        <span className="font-bold text-lg text-blue-600">{activePlayer.name}</span>
        {!isPending && <span className="text-sm text-gray-500">'s turn</span>}
      </div>

      <div className="flex items-center gap-3 justify-center">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 font-medium">$</span>
          <input
            type="number"
            value={bidAmount}
            onChange={(e) => setBidAmount(Number(e.target.value))}
            min={minBid}
            max={maxBid}
            className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={() => onBid(activePlayer.id, bidAmount)}
          disabled={bidAmount < minBid || bidAmount > maxBid}
          className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isPending ? 'Open' : 'Raise'}
        </button>

        {isActive && (
          <button
            onClick={() => onPass(activePlayer.id)}
            className="px-6 py-2 bg-red-100 text-red-700 rounded-lg font-bold hover:bg-red-200"
          >
            Pass
          </button>
        )}
      </div>

      <div className="text-center mt-2 text-xs text-gray-400">
        Min: ${minBid} &middot; Balance: ${activePlayer.balance}
      </div>
    </div>
  )
}
