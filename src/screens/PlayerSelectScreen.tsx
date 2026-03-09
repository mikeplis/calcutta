import { useSyncExternalStore, useCallback } from 'react'
import type { FirebaseAuctionService } from '../service/FirebaseAuctionService'

type Props = {
  service: FirebaseAuctionService
  sessionToken: string
  onPlayerSelected: (playerId: string) => void
}

export function PlayerSelectScreen({ service, sessionToken, onPlayerSelected }: Props) {
  const state = useSyncExternalStore(
    useCallback((cb: () => void) => service.subscribe(cb), [service]),
    () => service.getState()
  )

  const claimedPlayers = state.claimedPlayers ?? {}

  const handleClaim = async (playerId: string) => {
    const success = await service.claimPlayer(playerId, sessionToken)
    if (success) {
      onPlayerSelected(playerId)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-1 text-center">Join Auction</h1>
        <p className="text-sm text-gray-500 mb-4 text-center">Select your player to start bidding</p>

        <div className="space-y-2">
          {state.players.map((player) => {
            const claimedBySession = claimedPlayers[player.id]
            const isMine = claimedBySession === sessionToken
            const isTaken = !!claimedBySession && !isMine

            return (
              <button
                key={player.id}
                onClick={() => {
                  if (isMine) {
                    onPlayerSelected(player.id)
                  } else if (!isTaken) {
                    handleClaim(player.id)
                  }
                }}
                disabled={isTaken}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                  isMine
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : isTaken
                      ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                      : 'border-gray-200 bg-white text-gray-900 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{player.name}</span>
                    <span className="ml-2 text-sm text-gray-500">${player.balance}</span>
                  </div>
                  {isMine && (
                    <span className="text-xs font-medium text-blue-600">You</span>
                  )}
                  {isTaken && (
                    <span className="text-xs font-medium text-gray-400">Taken</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
