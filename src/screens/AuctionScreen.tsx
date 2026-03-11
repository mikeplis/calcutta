import { useRef, useState, useEffect, useCallback } from 'react'
import { useAuction } from '../hooks/useAuction'
import { LotCard } from './components/LotCard'
import { BidControls } from './components/BidControls'
import { PlayerList } from './components/PlayerList'
import { AdminControls } from './components/AdminControls'
import { LotHistoryPanel } from './components/LotHistoryPanel'
import type { LotAuctionState } from '../domain/types'
import { getActivePlayerTurn, getCurrentLotState, findEligibleOpener } from '../domain/logic'

type SoldInfo = { winner: string; amount: number; lotLabel: string }

export function AuctionScreen({ onNewAuction }: { onNewAuction: () => void }) {
  const { state, dispatch, isAdmin, currentPlayerId } = useAuction()
  const [soldInfo, setSoldInfo] = useState<SoldInfo | null>(null)
  const prevLotStatesRef = useRef<Record<string, LotAuctionState>>(state.lotStates)
  const soldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Start auto-dismiss timer when soldInfo is set
  useEffect(() => {
    if (!soldInfo) return
    if (soldTimerRef.current) clearTimeout(soldTimerRef.current)
    soldTimerRef.current = setTimeout(() => {
      setSoldInfo(null)
      soldTimerRef.current = null
    }, 2000)
    return () => {
      if (soldTimerRef.current) clearTimeout(soldTimerRef.current)
    }
  }, [soldInfo])

  const handleDismissSold = useCallback(() => {
    setSoldInfo(null)
  }, [])

  // Detect sales synchronously during render to avoid a flash of next-lot content.
  // This must come AFTER all hooks — setSoldInfo during render restarts the render,
  // and any hooks below it would not run, causing a "fewer hooks" error.
  const prev = prevLotStatesRef.current
  let newSale: SoldInfo | null = null
  for (const lotId of Object.keys(state.lotStates)) {
    const prevState = prev[lotId]
    const curState = state.lotStates[lotId]
    if (curState?.status === 'sold' && prevState?.status !== 'sold') {
      const lot = state.lots.find((l) => l.id === lotId)
      const winner = state.players.find((p) => p.id === curState.winnerId)
      newSale = {
        winner: winner?.name ?? 'Unknown',
        amount: curState.finalBid,
        lotLabel: lot?.label ?? lotId,
      }
      break
    }
  }
  if (newSale && !soldInfo) {
    setSoldInfo(newSale)
  }
  prevLotStatesRef.current = state.lotStates

  const handleBid = (playerId: string, amount: number) => {
    dispatch({ type: 'PLACE_BID', playerId, amount })
  }

  const handlePass = (playerId: string) => {
    dispatch({ type: 'PASS', playerId })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Calcutta Auction</h1>
            {state.testMode && (
              <span className="px-2 py-0.5 text-xs font-bold bg-orange-100 text-orange-700 rounded-full uppercase tracking-wide">
                Test Mode
              </span>
            )}
          </div>
          {isAdmin ? (
            <AdminControls
              canUndo={state.stateHistory.length > 0}
              onUndo={() => dispatch({ type: 'UNDO' })}
              onNewAuction={onNewAuction}
            />
          ) : null}
        </div>

        {isAdmin && (
          <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
            <span>Share link:</span>
            <code className="bg-gray-200 px-2 py-1 rounded text-xs select-all">
              {window.location.href}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(window.location.href)}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Copy
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <LotCard state={state} soldInfo={soldInfo ?? undefined} onDismissSold={handleDismissSold} />
            {(() => {
              if (!currentPlayerId) return null
              const lotState = getCurrentLotState(state)
              let activePlayerId: string | null = null
              if (lotState?.status === 'pending') {
                activePlayerId = findEligibleOpener(state)
              } else if (lotState?.status === 'active') {
                activePlayerId = getActivePlayerTurn(state)?.id ?? null
              }
              const showControls = state.testMode
                ? activePlayerId != null
                : activePlayerId === currentPlayerId
              return showControls
                ? <BidControls state={state} onBid={handleBid} onPass={handlePass} />
                : null
            })()}
            <LotHistoryPanel state={state} />
          </div>
          <div>
            <PlayerList state={state} />
          </div>
        </div>
      </div>
    </div>
  )
}
