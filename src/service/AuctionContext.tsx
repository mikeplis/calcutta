import { createContext, useContext } from 'react'
import type { AuctionService } from './AuctionService'

const AuctionServiceContext = createContext<AuctionService | null>(null)

export function AuctionServiceProvider({
  service,
  children,
}: {
  service: AuctionService
  children: React.ReactNode
}) {
  return (
    <AuctionServiceContext.Provider value={service}>
      {children}
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
