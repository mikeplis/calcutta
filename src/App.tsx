import { useState, useCallback } from 'react'
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom'
import { AuctionServiceProvider } from './service/AuctionContext'
import { LocalAuctionService } from './service/LocalAuctionService'
import { useSetupStore } from './hooks/useSetupStore'
import { SetupScreen } from './screens/SetupScreen'
import { AuctionScreen } from './screens/AuctionScreen'
import { SummaryScreen } from './screens/SummaryScreen'
import { useAuction } from './hooks/useAuction'
import type { AuctionState, LotAuctionState } from './domain/types'

function AuctionView({ onNewAuction }: { onNewAuction: () => void }) {
  const { state } = useAuction()

  if (state.phase === 'complete') {
    return <SummaryScreen onNewAuction={onNewAuction} />
  }

  return <AuctionScreen />
}

function AppRoutes() {
  const navigate = useNavigate()
  const [service, setService] = useState<LocalAuctionService | null>(null)

  const handleStart = useCallback(() => {
    const { players, lots, openerPlayerId } = useSetupStore.getState()

    const lotStates: Record<string, LotAuctionState> = {}
    for (const lot of lots) {
      lotStates[lot.id] = { status: 'pending' }
    }

    const initialState: AuctionState = {
      auctionId: crypto.randomUUID(),
      players,
      lots,
      lotStates,
      currentLotIndex: 0,
      phase: 'setup',
      openerPlayerId,
      adminId: 'local-admin',
      stateHistory: [],
      paused: false,
    }

    const svc = new LocalAuctionService(initialState, false)
    svc.dispatch({ type: 'START_AUCTION' })
    svc.enablePersistence()
    setService(svc)
    navigate('/auction')
  }, [navigate])

  const handleNewAuction = useCallback(() => {
    if (service) {
      service.clearStorage()
    }
    setService(null)
    navigate('/')
  }, [service, navigate])

  return (
    <Routes>
      <Route path="/" element={<SetupScreen onStart={handleStart} />} />
      <Route
        path="/auction"
        element={
          service ? (
            <AuctionServiceProvider service={service}>
              <AuctionView onNewAuction={handleNewAuction} />
            </AuctionServiceProvider>
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return <AppRoutes />
}
