import { useState } from 'react'
import type { AuctionState } from '../../domain/types'
import { getActivePlayerTurn, getCurrentLotState, getEligibleBidders, getPendingTurnPlayer } from '../../domain/logic'

type Props = {
  state: AuctionState
}

export function PlayerList({ state }: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const lotState = getCurrentLotState(state)
  const activePlayer = getActivePlayerTurn(state)
  const pendingTurnPlayer = lotState?.status === 'pending' ? getPendingTurnPlayer(state) : null
  const eligible = lotState?.status === 'active' ? getEligibleBidders(state) : []
  const eligibleIds = new Set(eligible.map((p) => p.id))
  const passedIds = lotState?.status === 'active' ? new Set(lotState.passedPlayerIds) : new Set<string>()
  const maxStartingBalance = Math.max(...state.players.map((p) => {
    const spent = p.lotsWon.reduce((sum, lotId) => {
      const ls = state.lotStates[lotId]
      return sum + (ls?.status === 'sold' ? ls.finalBid : 0)
    }, 0)
    return p.balance + spent
  }))
  const lowBalanceThreshold = maxStartingBalance * 0.2

  return (
    <div className="bg-white rounded-xl shadow-md p-4">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Players</h3>
      <div className="divide-y divide-slate-100">
        {state.players.map((player) => {
          const isActive = activePlayer?.id === player.id
          const isPendingOpener = pendingTurnPlayer?.id === player.id
          const hasPassed = passedIds.has(player.id)
          const isEligible = eligibleIds.has(player.id)
          const isCurrentBidder =
            lotState?.status === 'active' && lotState.currentBid.playerId === player.id

          const isExpanded = expandedIds.has(player.id)
          const toggleExpanded = () => {
            if (player.lotsWon.length === 0) return
            setExpandedIds((prev) => {
              const next = new Set(prev)
              next.has(player.id) ? next.delete(player.id) : next.add(player.id)
              return next
            })
          }

          return (
            <div key={player.id}>
              <div
                className={`flex items-center justify-between py-3 px-2 rounded-lg transition-colors ${
                  isActive || isPendingOpener
                    ? 'bg-indigo-50 border-l-2 border-indigo-500 -ml-2 pl-4'
                    : isCurrentBidder
                      ? 'bg-green-50'
                      : hasPassed
                        ? 'opacity-50'
                        : ''
                }${player.lotsWon.length > 0 ? ' cursor-pointer' : ''}`}
                onClick={toggleExpanded}
              >
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${hasPassed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                    {player.name}
                  </span>
                  {isActive && (
                    <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full animate-pulse">
                      BIDDING
                    </span>
                  )}
                  {isPendingOpener && (
                    <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full animate-pulse">
                      OPENING
                    </span>
                  )}
                  {isCurrentBidder && !isActive && (
                    <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">
                      HIGH BID
                    </span>
                  )}
                  {hasPassed && (
                    <span className="text-xs bg-gray-400 text-white px-2 py-0.5 rounded-full">
                      PASSED
                    </span>
                  )}
                  {!hasPassed && !isEligible && lotState?.status === 'active' && player.id !== lotState.currentBid.playerId && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                      SKIPPED
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${player.balance < lowBalanceThreshold ? 'text-red-600' : 'text-slate-800'}`}>
                      ${player.balance}
                    </span>
                    {player.lotsWon.length > 0 && (
                      <span className="text-xs text-gray-400">
                        {player.lotsWon.length} lot{player.lotsWon.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {player.lotsWon.length > 0 && (
                    <span className="text-gray-400 text-xs">{isExpanded ? '▲' : '▼'}</span>
                  )}
                </div>
              </div>
              {isExpanded && (
                <div className="px-3 pb-3 space-y-1">
                  {[...player.lotsWon].reverse().map((lotId) => {
                    const lot = state.lots.find((l) => l.id === lotId)
                    const ls = state.lotStates[lotId]
                    const seeds = lot?.teams.map((t) => `#${t.seed}`).join('/') ?? ''
                    const paid = ls?.status === 'sold' ? ls.finalBid : null
                    return (
                      <div key={lotId} className="flex items-center justify-between text-sm py-1 border-t border-gray-100">
                        <span className="text-gray-500">
                          <span className="text-gray-400 mr-1">{seeds}</span>
                          {lot?.label ?? lotId}
                        </span>
                        {paid !== null && <span className="font-medium text-green-700">${paid}</span>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
