import { useAuction } from '../hooks/useAuction'
import { LotCard } from './components/LotCard'
import { BidControls } from './components/BidControls'
import { PlayerList } from './components/PlayerList'
import { AdminControls } from './components/AdminControls'
import { LotHistoryPanel } from './components/LotHistoryPanel'

export function AuctionScreen({ onNewAuction }: { onNewAuction: () => void }) {
  const { state, dispatch } = useAuction()

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
