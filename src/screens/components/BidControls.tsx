import { useState, useEffect, useCallback } from 'react'
import type { AuctionState } from '../../domain/types'
import { getMinimumBid, getActivePlayerTurn, getCurrentLotState, findEligibleOpener } from '../../domain/logic'

type Props = {
  state: AuctionState
  onBid: (playerId: string, amount: number) => void
  onPass: (playerId: string) => void
}

export function BidControls({ state, onBid, onPass }: Props) {
  const lotState = getCurrentLotState(state)
  const minBid = getMinimumBid(state)
  const [bidInput, setBidInput] = useState(String(minBid))
  const bidAmount = Number(bidInput) || 0

  const isPending = lotState?.status === 'pending'
  const isActive = lotState?.status === 'active'

  // Determine who can act
  let activePlayerId: string | null = null
  if (isPending) {
    activePlayerId = findEligibleOpener(state)
  } else if (isActive) {
    const turn = getActivePlayerTurn(state)
    activePlayerId = turn?.id ?? null
  }

  const activePlayer = state.players.find((p) => p.id === activePlayerId)

  // Update bid amount when minimum changes
  useEffect(() => {
    setBidInput(String(minBid))
  }, [minBid])

  if (state.paused) return null

  if (!activePlayer) {
    if (isPending || isActive) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-4 text-center">
          <span className="text-sm text-orange-700 font-medium">
            No eligible bidders — use Skip Lot to advance
          </span>
        </div>
      )
    }
    return null
  }

  const maxBid = activePlayer.balance
  const quickIncrements = [1, 5, 10, 25]

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && bidAmount >= minBid && bidAmount <= maxBid) {
      onBid(activePlayer.id, bidAmount)
    } else if (e.key === 'Escape' && isActive) {
      onPass(activePlayer.id)
    }
  }, [bidAmount, minBid, maxBid, activePlayer.id, isActive, onBid, onPass])

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4" onKeyDown={handleKeyDown}>
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
            value={bidInput}
            onChange={(e) => setBidInput(e.target.value)}
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

      <div className="flex items-center gap-2 justify-center mt-2">
        {quickIncrements.map((inc) => {
          if (isPending) {
            // Opening bid: set to exact amount
            const target = Math.min(inc, maxBid)
            return (
              <button
                key={inc}
                onClick={() => setBidInput(String(Math.max(target, minBid)))}
                disabled={target < minBid}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
              >
                ${inc}
              </button>
            )
          }
          // Active bidding: increment from current amount
          const target = Math.min(bidAmount + inc, maxBid)
          return (
            <button
              key={inc}
              onClick={() => setBidInput(String(Math.max(target, minBid)))}
              disabled={target < minBid}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
            >
              +${inc}
            </button>
          )
        })}
      </div>

      <div className="text-center mt-2 text-xs text-gray-400">
        Min: ${minBid} &middot; Balance: ${activePlayer.balance}
      </div>
    </div>
  )
}
