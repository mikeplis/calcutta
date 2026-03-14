import { useState, useCallback, useEffect } from 'react'
import { Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom'
import { AuctionServiceProvider } from './service/AuctionContext'
import { FirebaseAuctionService } from './service/FirebaseAuctionService'
import { useSetupStore } from './hooks/useSetupStore'
import { SetupScreen } from './screens/SetupScreen'
import { AuctionScreen } from './screens/AuctionScreen'
import { SummaryScreen } from './screens/SummaryScreen'
import { PlayerSelectScreen } from './screens/PlayerSelectScreen'
import { AnimationPlayground } from './screens/AnimationPlayground'
import { useAuction } from './hooks/useAuction'
import { ErrorBoundary } from './screens/components/ErrorBoundary'
import type { AuctionState, LotAuctionState } from './domain/types'

const SESSION_TOKEN_KEY = 'calcutta-session-token'
const ADMIN_AUCTION_KEY = 'calcutta-admin-auction-id'

function getSessionToken(): string {
  let token = sessionStorage.getItem(SESSION_TOKEN_KEY)
  if (!token) {
    token = crypto.randomUUID()
    sessionStorage.setItem(SESSION_TOKEN_KEY, token)
  }
  return token
}

/** Find if our session token already claimed a player. */
function findClaimedPlayerId(state: AuctionState, sessionToken: string): string | null {
  const claimed = state.claimedPlayers ?? {}
  for (const [playerId, token] of Object.entries(claimed)) {
    if (token === sessionToken) return playerId
  }
  return null
}

function AuctionView({ onNewAuction }: { onNewAuction: () => void }) {
  const { state } = useAuction()

  if (state.phase === 'complete') {
    return <SummaryScreen onNewAuction={onNewAuction} />
  }

  return <AuctionScreen onNewAuction={onNewAuction} />
}

/** Viewer route: joins an existing auction by ID from the URL. */
function AuctionRoute() {
  const { auctionId } = useParams<{ auctionId: string }>()
  const [service, setService] = useState<FirebaseAuctionService | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null)
  const sessionToken = useState(() => getSessionToken())[0]
  const isAdmin = auctionId === sessionStorage.getItem(ADMIN_AUCTION_KEY)

  useEffect(() => {
    if (!auctionId) return
    let cancelled = false

    FirebaseAuctionService.join(auctionId).then((svc) => {
      if (cancelled) {
        svc?.destroy()
        return
      }
      if (svc) {
        setService(svc)
        // In test mode, skip player claiming and auto-select first player
        if (svc.getState().testMode) {
          setCurrentPlayerId(svc.getState().players[0].id)
        } else {
          // Check if we already claimed a player (reconnect)
          const existing = findClaimedPlayerId(svc.getState(), sessionToken)
          if (existing) setCurrentPlayerId(existing)
        }
      } else {
        setError('Auction not found')
      }
    }).catch(() => {
      if (!cancelled) setError('Failed to load auction')
    })

    return () => {
      cancelled = true
    }
  }, [auctionId, sessionToken])

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{error}</h1>
          <a href="/" className="text-blue-600 hover:underline">Go home</a>
        </div>
      </div>
    )
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-lg">Loading auction...</p>
      </div>
    )
  }

  if (!currentPlayerId) {
    return (
      <PlayerSelectScreen
        service={service}
        sessionToken={sessionToken}
        onPlayerSelected={setCurrentPlayerId}
      />
    )
  }

  return (
    <AuctionServiceProvider service={service} isAdmin={isAdmin} currentPlayerId={currentPlayerId}>
      <AuctionView onNewAuction={() => {}} />
    </AuctionServiceProvider>
  )
}

function AppRoutes() {
  const navigate = useNavigate()
  const [service, setService] = useState<FirebaseAuctionService | null>(null)
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null)
  const sessionToken = useState(() => getSessionToken())[0]

  const handleStart = useCallback(async () => {
    const { players, lots, openerPlayerId, testMode } = useSetupStore.getState()

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
      claimedPlayers: {},
      testMode,
    }

    const svc = await FirebaseAuctionService.create(initialState)
    await svc.dispatch({ type: 'START_AUCTION' })
    sessionStorage.setItem(ADMIN_AUCTION_KEY, initialState.auctionId)
    setService(svc)
    if (testMode) {
      setCurrentPlayerId(players[0].id)
    }
    navigate(`/auction/${initialState.auctionId}`)
  }, [navigate])

  const handleNewAuction = useCallback(() => {
    if (service) {
      service.destroy()
    }
    sessionStorage.removeItem(ADMIN_AUCTION_KEY)
    setService(null)
    setCurrentPlayerId(null)
    navigate('/')
  }, [service, navigate])

  return (
    <ErrorBoundary>
    <Routes>
      <Route
        path="/"
        element={<SetupScreen onStart={handleStart} />}
      />
      <Route
        path="/auction/:auctionId"
        element={
          service ? (
            !currentPlayerId ? (
              <PlayerSelectScreen
                service={service}
                sessionToken={sessionToken}
                onPlayerSelected={setCurrentPlayerId}
              />
            ) : (
              <AuctionServiceProvider service={service} isAdmin={true} currentPlayerId={currentPlayerId}>
                <AuctionView onNewAuction={handleNewAuction} />
              </AuctionServiceProvider>
            )
          ) : (
            <AuctionRoute />
          )
        }
      />
      <Route path="/animations" element={<AnimationPlayground />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </ErrorBoundary>
  )
}

export default function App() {
  return <AppRoutes />
}
