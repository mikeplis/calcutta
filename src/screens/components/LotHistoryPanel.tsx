import { useState } from 'react'
import type { AuctionState } from '../../domain/types'

type Props = {
  state: AuctionState
}

export function LotHistoryPanel({ state }: Props) {
  const [expanded, setExpanded] = useState(true)

  const completedLots = state.lots
    .map((lot) => ({ lot, lotState: state.lotStates[lot.id] }))
    .filter(({ lotState }) => lotState?.status === 'sold' || lotState?.status === 'skipped')
    .reverse()

  if (completedLots.length === 0) return null

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 rounded-xl"
      >
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Completed Lots ({completedLots.length})
        </h3>
        <span className="text-gray-400">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-1">
          {completedLots.map(({ lot, lotState }) => (
            <div key={lot.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <span className="text-sm font-medium text-gray-700">
                <span className="text-gray-400 font-normal mr-1">
                  {lot.teams.map((t) => `#${t.seed}`).join('/')}
                </span>
                {lot.label}
              </span>
              {lotState.status === 'sold' ? (
                <span className="text-sm">
                  <span className="text-gray-500">
                    {state.players.find((p) => p.id === lotState.winnerId)?.name}
                  </span>
                  <span className="font-bold text-green-700 ml-2">${lotState.finalBid}</span>
                </span>
              ) : (
                <span className="text-sm text-gray-400 italic">Skipped</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
