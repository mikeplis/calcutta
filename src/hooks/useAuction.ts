import { useSyncExternalStore, useCallback } from 'react'
import type { AuctionState, AuctionAction } from '../domain/types'
import { useAuctionService, useIsAdmin, useCurrentPlayerId } from '../service/AuctionContext'

export function useAuction(): {
  state: AuctionState
  dispatch: (action: AuctionAction) => Promise<void>
  isAdmin: boolean
  currentPlayerId: string | null
} {
  const service = useAuctionService()
  const isAdmin = useIsAdmin()
  const currentPlayerId = useCurrentPlayerId()

  const state = useSyncExternalStore(
    useCallback((cb: () => void) => service.subscribe(cb), [service]),
    () => service.getState()
  )

  const dispatch = useCallback(
    (action: AuctionAction) => service.dispatch(action),
    [service]
  )

  return { state, dispatch, isAdmin, currentPlayerId }
}
