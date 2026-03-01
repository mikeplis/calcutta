import type { AuctionState } from '../../domain/types'
import { getCurrentLot, getCurrentLotState } from '../../domain/logic'

type Props = {
  state: AuctionState
}

export function LotCard({ state }: Props) {
  const lot = getCurrentLot(state)
  const lotState = getCurrentLotState(state)

  if (!lot) return null

  const lotNumber = state.currentLotIndex + 1
  const totalLots = state.lots.length

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400 font-medium">
          Lot {lotNumber} of {totalLots}
        </span>
        {lotState?.status === 'active' && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
            LIVE
          </span>
        )}
        {lotState?.status === 'pending' && (
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
            AWAITING OPEN
          </span>
        )}
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-3">{lot.label}</h2>

      <div className="flex flex-wrap gap-2 mb-4">
        {lot.teams.map((team, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm"
          >
            <span className="font-medium text-gray-900">{team.name}</span>
            <span className="text-gray-500">({team.region} #{team.seed})</span>
          </span>
        ))}
      </div>

      {lotState?.status === 'active' && (
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-sm text-green-600 font-medium">Current High Bid</div>
          <div className="text-4xl font-bold text-green-700">${lotState.currentBid.amount}</div>
          <div className="text-sm text-green-600">
            by {state.players.find((p) => p.id === lotState.currentBid.playerId)?.name}
          </div>
        </div>
      )}

      {state.paused && (
        <div className="bg-yellow-50 rounded-lg p-3 text-center">
          <span className="text-yellow-700 font-bold">PAUSED</span>
        </div>
      )}
    </div>
  )
}
