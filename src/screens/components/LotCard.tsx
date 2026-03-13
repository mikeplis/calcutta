import { useState, useEffect, useRef, useCallback, Fragment } from 'react'
import type { AuctionState } from '../../domain/types'
import { getCurrentLot, getCurrentLotState } from '../../domain/logic'
import { SEED_PROBS } from '../../domain/seedProbabilities'

type SoldInfo = { winner: string; amount: number; lotLabel: string; seedLabel: string }

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
    <div className={`relative rounded-xl shadow-md overflow-hidden border-l-4 ${
      lotState?.status === 'active' ? 'border-l-emerald-500' :
      lotState?.status === 'pending' ? 'border-l-indigo-400' : 'border-l-transparent'
    }`}>
      {/* Normal card content — always rendered to maintain height */}
      <div className={`bg-white p-4 sm:p-6${showOverlay ? ' invisible' : ''}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">
            Lot {lotNumber} of {totalLots}
          </span>
          {lotState?.status === 'active' && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
              LIVE
            </span>
          )}
          {lotState?.status === 'pending' && (
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
              AWAITING OPEN
            </span>
          )}
        </div>

        <h2 className="text-3xl font-bold text-gray-900 mb-3">{lot.label}</h2>

        {(() => {
          const hasAnyStats = lot.teams.some(t => SEED_PROBS[t.seed] || t.kenpomRank)
          const fmt = (n: number) => n < 0.01 ? '<1%' : `${Math.round(n * 100)}%`
          const statCols = [
            ['KP',    `KenPom rank`],
            ['S16',   'Sweet 16 — historical rate for this seed (1985–2024)'],
            ['E8',    'Elite 8 — historical rate for this seed (1985–2024)'],
            ['F4',    'Final Four — historical rate for this seed (1985–2024)'],
            ['Final', 'Championship game — historical rate for this seed (1985–2024)'],
            ['Win',   'Champion — historical rate for this seed (1985–2024)'],
          ] as [string, string][]
          return (
            <div className="mb-4 space-y-2">
              {lot.teams.map((team, i) => {
                const probs = SEED_PROBS[team.seed]
                return (
                  <Fragment key={i}>
                    {i > 0 && <div className="border-t border-gray-100" />}
                    {/* Identity row */}
                    <div className="flex items-center gap-2 min-w-0 pt-1">
                      {team.logoUrl && (
                        <img src={team.logoUrl} alt="" className="w-6 h-6 object-contain flex-shrink-0 drop-shadow-[0_0_1px_rgba(0,0,0,0.3)]" />
                      )}
                      <span className="text-sm font-bold text-gray-400">#{team.seed}</span>
                      <span className="font-semibold text-gray-900 truncate">{team.name}</span>
                      {team.record && <span className="text-sm text-gray-500 flex-shrink-0">{team.record}</span>}
                      {team.conference && <span className="text-sm text-gray-400 flex-shrink-0">{team.conference}</span>}
                      {!team.record && !team.conference && (
                        <span className="text-sm text-gray-500">{team.region}</span>
                      )}
                    </div>
                    {/* Stat row — always below identity, aligned via grid */}
                    {hasAnyStats && (
                      <div className="grid grid-cols-[repeat(6,1fr)] gap-x-2 text-xs items-center pb-1">
                        {statCols.map(([label, tooltip]) => (
                          <div key={label} className="text-center text-gray-400 font-medium cursor-help" title={tooltip}>{label}</div>
                        ))}
                        <div className="text-center" title={team.kenpomRank ? `KenPom rank #${team.kenpomRank}${team.kenpomAdjEM !== undefined ? ` · Adjusted Efficiency Margin: ${team.kenpomAdjEM >= 0 ? '+' : ''}${team.kenpomAdjEM.toFixed(1)} (points per 100 possessions vs average)` : ''}` : undefined}>
                          {team.kenpomRank ? (
                            <span className="font-semibold text-blue-600 whitespace-nowrap">
                              #{team.kenpomRank}
                              {team.kenpomAdjEM !== undefined && (
                                <span className="font-normal text-blue-400"> ({team.kenpomAdjEM >= 0 ? '+' : ''}{team.kenpomAdjEM.toFixed(1)})</span>
                              )}
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </div>
                        {(['s16', 'e8', 'f4', 'final', 'win'] as const).map((key) => (
                          <div key={key} className="text-center font-medium text-gray-700">
                            {probs ? fmt(probs[key]) : <span className="text-gray-300">—</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </Fragment>
                )
              })}
            </div>
          )
        })()}

        {lotState?.status === 'active' ? (
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-sm text-green-600 font-medium">Current High Bid</div>
            <div className="text-5xl font-black text-emerald-700">${lotState.currentBid.amount}</div>
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
            <h2 className="text-2xl font-bold text-gray-900 mt-3 mb-4">
              {displayedSoldInfo!.seedLabel && (
                <span className="text-lg font-normal text-green-600 mr-1">{displayedSoldInfo!.seedLabel}</span>
              )}
              {displayedSoldInfo!.lotLabel}
            </h2>
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
