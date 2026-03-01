import { useRef, useState, useEffect, useCallback } from 'react'
import { useAuction } from '../hooks/useAuction'
import { LotCard } from './components/LotCard'
import { BidControls } from './components/BidControls'
import { PlayerList } from './components/PlayerList'
import { AdminControls } from './components/AdminControls'
import { LotHistoryPanel } from './components/LotHistoryPanel'
import { SoldBanner } from './components/SoldBanner'
import type { LotAuctionState } from '../domain/types'

type SoldInfo = { winner: string; amount: number; lotLabel: string }

export function AuctionScreen({ onNewAuction }: { onNewAuction: () => void }) {
  const { state, dispatch } = useAuction()
  const [soldInfo, setSoldInfo] = useState<SoldInfo | null>(null)
  const prevLotStatesRef = useRef<Record<string, LotAuctionState>>(state.lotStates)

  useEffect(() => {
    const prev = prevLotStatesRef.current
    // Detect any lot that just transitioned to 'sold'
    for (const lotId of Object.keys(state.lotStates)) {
      const prevState = prev[lotId]
      const curState = state.lotStates[lotId]
      if (
        curState?.status === 'sold' &&
        prevState?.status !== 'sold'
      ) {
        const lot = state.lots.find((l) => l.id === lotId)
        const winner = state.players.find((p) => p.id === curState.winnerId)
        setSoldInfo({
          winner: winner?.name ?? 'Unknown',
          amount: curState.finalBid,
          lotLabel: lot?.label ?? lotId,
        })
        break
      }
    }
    prevLotStatesRef.current = state.lotStates
  }, [state.lotStates, state.lots, state.players])

  const handleDismissSold = useCallback(() => setSoldInfo(null), [])

  const handleBid = (playerId: string, amount: number) => {
    dispatch({ type: 'PLACE_BID', playerId, amount })
  }

  const handlePass = (playerId: string) => {
    dispatch({ type: 'PASS', playerId })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {soldInfo && (
        <SoldBanner
          winner={soldInfo.winner}
          amount={soldInfo.amount}
          lotLabel={soldInfo.lotLabel}
          onDismiss={handleDismissSold}
        />
      )}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Calcutta Auction</h1>
          <AdminControls
            paused={state.paused}
            canUndo={state.stateHistory.length > 0}
            onUndo={() => dispatch({ type: 'UNDO' })}
            onForceAdvance={() => dispatch({ type: 'FORCE_ADVANCE' })}
            onPause={() => dispatch({ type: 'PAUSE' })}
            onResume={() => dispatch({ type: 'RESUME' })}
            onNewAuction={onNewAuction}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <LotCard state={state} />
            <BidControls state={state} onBid={handleBid} onPass={handlePass} />
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
