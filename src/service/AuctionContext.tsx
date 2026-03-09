import { createContext, useContext } from 'react'
import type { AuctionService } from './AuctionService'

const AuctionServiceContext = createContext<AuctionService | null>(null)
const IsAdminContext = createContext<boolean>(false)
const CurrentPlayerContext = createContext<string | null>(null)

export function AuctionServiceProvider({
  service,
  isAdmin,
  currentPlayerId,
  children,
}: {
  service: AuctionService
  isAdmin: boolean
  currentPlayerId: string | null
  children: React.ReactNode
}) {
  return (
    <AuctionServiceContext.Provider value={service}>
      <IsAdminContext.Provider value={isAdmin}>
        <CurrentPlayerContext.Provider value={currentPlayerId}>
          {children}
        </CurrentPlayerContext.Provider>
      </IsAdminContext.Provider>
    </AuctionServiceContext.Provider>
  )
}

export function useAuctionService(): AuctionService {
  const service = useContext(AuctionServiceContext)
  if (!service) {
    throw new Error('useAuctionService must be used within AuctionServiceProvider')
  }
  return service
}

export function useIsAdmin(): boolean {
  return useContext(IsAdminContext)
}

export function useCurrentPlayerId(): string | null {
  return useContext(CurrentPlayerContext)
}
