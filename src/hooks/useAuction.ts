import { useSyncExternalStore, useCallback } from 'react'
import type { AuctionState, AuctionAction } from '../domain/types'
import { useAuctionService } from '../service/AuctionContext'

export function useAuction(): {
  state: AuctionState
  dispatch: (action: AuctionAction) => Promise<void>
} {
  const service = useAuctionService()

  const state = useSyncExternalStore(
    useCallback((cb: () => void) => service.subscribe(cb), [service]),
    () => service.getState()
  )

  const dispatch = useCallback(
    (action: AuctionAction) => service.dispatch(action),
    [service]
  )

  return { state, dispatch }
}
