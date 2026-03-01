import { useState, useEffect, useRef, useCallback } from 'react'
import type { AuctionState } from '../../domain/types'
import { getCurrentLot, getCurrentLotState } from '../../domain/logic'

type SoldInfo = { winner: string; amount: number; lotLabel: string }

type Props = {
  state: AuctionState
  soldInfo?: SoldInfo
  onDismissSold?: () => void
}

export function LotCard({ state, soldInfo, onDismissSold }: Props) {
  const [dismissing, setDismissing] = useState(false)
  const [displayedSoldInfo, setDisplayedSoldInfo] = useState<SoldInfo | undefined>(soldInfo)
  const onDismissSoldRef = useRef(onDismissSold)
  onDismissSoldRef.current = onDismissSold

  useEffect(() => {
    if (soldInfo) {
      // New sold info arrived — show it immediately
      setDisplayedSoldInfo(soldInfo)
      setDismissing(false)
    } else if (displayedSoldInfo && !dismissing) {
      // soldInfo cleared externally (e.g. timer) — start fade-out
      setDismissing(true)
    }
  }, [soldInfo]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDismissClick = useCallback(() => {
    setDismissing(true)
  }, [])

  const handleAnimationEnd = useCallback(() => {
    if (dismissing) {
      setDismissing(false)
      setDisplayedSoldInfo(undefined)
      onDismissSoldRef.current?.()
    }
  }, [dismissing])

  const showOverlay = !!displayedSoldInfo

  const lot = getCurrentLot(state)
  const lotState = getCurrentLotState(state)

  if (!lot) return null

  const lotNumber = state.currentLotIndex + 1
  const totalLots = state.lots.length

  return (
    <div className="relative rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Normal card content — always rendered to maintain height */}
      <div className={`bg-white p-6${showOverlay ? ' invisible' : ''}`}>
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

        {lotState?.status === 'active' ? (
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-sm text-green-600 font-medium">Current High Bid</div>
            <div className="text-4xl font-bold text-green-700">${lotState.currentBid.amount}</div>
            <div className="text-sm text-green-600">
              by {state.players.find((p) => p.id === lotState.currentBid.playerId)?.name}
            </div>
          </div>
        ) : lotState?.status === 'pending' ? (
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-sm text-gray-400 font-medium">Current High Bid</div>
            <div className="text-4xl font-bold text-gray-300">&mdash;</div>
            <div className="text-sm text-gray-400">Waiting for opening bid</div>
          </div>
        ) : null}

        {state.paused && (
          <div className="bg-yellow-50 rounded-lg p-3 text-center">
            <span className="text-yellow-700 font-bold">PAUSED</span>
          </div>
        )}
      </div>

      {/* Sold overlay — covers the card without changing its height */}
      {showOverlay && (
        <div
          className={`absolute inset-0 bg-green-50 border-2 border-green-400 rounded-xl flex items-center justify-center cursor-pointer ${dismissing ? 'animate-fade-out' : 'animate-fade-in'}`}
          onClick={handleDismissClick}
          onAnimationEnd={handleAnimationEnd}
        >
          <div className={`${dismissing ? 'animate-fade-out-down' : 'animate-fade-in-up'} text-center`}>
            <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
              SOLD
            </span>
            <h2 className="text-2xl font-bold text-gray-900 mt-3 mb-4">{displayedSoldInfo!.lotLabel}</h2>
            <div className="text-lg text-gray-900">
              <span className="font-bold text-green-700">{displayedSoldInfo!.winner}</span>
              {' — '}
              <span className="font-bold text-green-700">${displayedSoldInfo!.amount}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
