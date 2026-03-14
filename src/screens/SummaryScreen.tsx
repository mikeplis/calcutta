import { useState } from 'react'
import { useAuction } from '../hooks/useAuction'
import { useTournamentResults } from '../hooks/useTournamentResults'
import { getPointsLeaderboard, getTournamentWinnerOwner } from '../domain/scoring'

export function SummaryScreen({ onNewAuction }: { onNewAuction: () => void }) {
  const { state, isAdmin } = useAuction()
  const year = 2025
  const { results, loading: resultsLoading, error: resultsError, refresh } = useTournamentResults(year)
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(new Set())
  const [resultsCollapsed, setResultsCollapsed] = useState(false)
  const [playersCollapsed, setPlayersCollapsed] = useState(false)

  const soldLots = state.lots
    .map((lot) => ({ lot, lotState: state.lotStates[lot.id] }))
    .filter(({ lotState }) => lotState?.status === 'sold')
    .map(({ lot, lotState }) => {
      if (lotState.status !== 'sold') throw new Error('unreachable')
      return {
        label: lot.label,
        teams: lot.teams.map((t) => `${t.name} (${t.region} #${t.seed})`).join(', '),
        winner: state.players.find((p) => p.id === lotState.winnerId)?.name ?? 'Unknown',
        price: lotState.finalBid,
      }
    })

  const skippedLots = state.lots.filter((lot) => state.lotStates[lot.id]?.status === 'skipped')

  const playerSummaries = state.players.map((player) => {
    const lotsWonDetails = player.lotsWon.map((lotId) => {
      const lot = state.lots.find((l) => l.id === lotId)
      const lotState = state.lotStates[lotId]
      return {
        label: lot?.label ?? lotId,
        price: lotState?.status === 'sold' ? lotState.finalBid : 0,
      }
    })
    const totalSpent = lotsWonDetails.reduce((sum, l) => sum + l.price, 0)
    return { name: player.name, totalSpent, lotsWon: lotsWonDetails.length, balance: player.balance }
  })

  const leaderboard = results ? getPointsLeaderboard(state, results) : []
  const champion = results ? getTournamentWinnerOwner(state, results) : null
  const minutesAgo = results ? Math.floor((Date.now() - results.lastUpdated) / 60000) : null

  const toggleExpanded = (playerId: string) => {
    setExpandedPlayers((prev) => {
      const next = new Set(prev)
      if (next.has(playerId)) {
        next.delete(playerId)
      } else {
        next.add(playerId)
      }
      return next
    })
  }

  const escapeCsvField = (value: string | number): string => {
    const str = String(value)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const handleExportCsv = () => {
    const header = 'Lot,Teams,Winner,Price\n'
    const rows = soldLots
      .map((l) => `${escapeCsvField(l.label)},${escapeCsvField(l.teams)},${escapeCsvField(l.winner)},${l.price}`)
      .join('\n')
    const playerHeader = '\n\nPlayer,Total Spent,Lots Won,Remaining Balance\n'
    const playerRows = playerSummaries
      .map((p) => `${escapeCsvField(p.name)},${p.totalSpent},${p.lotsWon},${p.balance}`)
      .join('\n')

    const csv = header + rows + playerHeader + playerRows
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'calcutta-results.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Auction Complete</h1>
          <div className="flex gap-2">
            <button
              onClick={handleExportCsv}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Export CSV
            </button>
            {isAdmin && (
              <button
                onClick={onNewAuction}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
              >
                New Auction
              </button>
            )}
          </div>
        </div>

        {/* Tournament Standings — shown first */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Tournament Standings</h2>
            <div className="flex items-center gap-3">
              {minutesAgo !== null && (
                <span className="text-sm text-gray-400">
                  Updated {minutesAgo === 0 ? 'just now' : `${minutesAgo}m ago`}
                </span>
              )}
              <button
                onClick={refresh}
                disabled={resultsLoading}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm font-medium hover:bg-gray-300 disabled:opacity-50"
              >
                {resultsLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          {resultsError && (
            <p className="text-sm text-red-600 mb-4">{resultsError}</p>
          )}

          {resultsLoading && !results && (
            <p className="text-sm text-gray-400">Loading tournament data...</p>
          )}

          {!resultsLoading && !results && !resultsError && (
            <p className="text-sm text-gray-400">No tournament data available.</p>
          )}

          {results && (
            <>
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Points Leaderboard
                </h3>
                {leaderboard.length === 0 ? (
                  <p className="text-sm text-gray-400">No results yet.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 pr-4 font-medium text-gray-500">Player</th>
                        <th className="text-right py-2 font-medium text-gray-500">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map(({ player, points, breakdown }, i) => (
                        <>
                          <tr
                            key={player.id}
                            className="border-b border-gray-100 cursor-pointer hover:bg-gray-50"
                            onClick={() => toggleExpanded(player.id)}
                          >
                            <td className="py-2 pr-4 font-medium">
                              <span className="text-gray-400 mr-2">{i + 1}.</span>
                              {player.name}
                              {breakdown.length > 0 && (
                                <span className="ml-2 text-xs text-gray-400">
                                  {expandedPlayers.has(player.id) ? '▲' : '▼'}
                                </span>
                              )}
                            </td>
                            <td className="py-2 text-right font-bold">{points}</td>
                          </tr>
                          {expandedPlayers.has(player.id) && breakdown.length > 0 && (
                            <tr key={`${player.id}-breakdown`} className="border-b border-gray-100 bg-gray-50">
                              <td colSpan={2} className="py-2 px-4">
                                <div className="space-y-1">
                                  {breakdown.map((entry) => (
                                    <div
                                      key={`${entry.teamName}-${entry.seed}`}
                                      className="flex justify-between text-xs text-gray-600"
                                    >
                                      <span>
                                        #{entry.seed} {entry.teamName}
                                      </span>
                                      <span className="font-medium">{entry.points} pts</span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Tournament Winner
                </h3>
                {champion ? (
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">{champion.name}</span> owns the champion
                  </p>
                ) : (
                  <p className="text-sm text-gray-400">Champion not yet determined</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Results — collapsible */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <button
            onClick={() => setResultsCollapsed((v) => !v)}
            className="flex items-center justify-between w-full text-left"
          >
            <h2 className="text-xl font-semibold text-gray-900">Results</h2>
            <span className="text-gray-400 text-sm">{resultsCollapsed ? '▼' : '▲'}</span>
          </button>
          {!resultsCollapsed && (
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 pr-4 font-medium text-gray-500">Lot</th>
                    <th className="text-left py-2 pr-4 font-medium text-gray-500">Teams</th>
                    <th className="text-left py-2 pr-4 font-medium text-gray-500">Winner</th>
                    <th className="text-right py-2 font-medium text-gray-500">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {soldLots.map((lot, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2 pr-4 font-medium">{lot.label}</td>
                      <td className="py-2 pr-4 text-gray-600">{lot.teams}</td>
                      <td className="py-2 pr-4">{lot.winner}</td>
                      <td className="py-2 text-right font-bold text-green-700">${lot.price}</td>
                    </tr>
                  ))}
                  {skippedLots.map((lot) => (
                    <tr key={lot.id} className="border-b border-gray-100">
                      <td className="py-2 pr-4 font-medium text-gray-400">{lot.label}</td>
                      <td className="py-2 pr-4 text-gray-400" colSpan={2}>Skipped</td>
                      <td className="py-2 text-right text-gray-400">-</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Player Summary — collapsible */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <button
            onClick={() => setPlayersCollapsed((v) => !v)}
            className="flex items-center justify-between w-full text-left"
          >
            <h2 className="text-xl font-semibold text-gray-900">Player Summary</h2>
            <span className="text-gray-400 text-sm">{playersCollapsed ? '▼' : '▲'}</span>
          </button>
          {!playersCollapsed && (
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 pr-4 font-medium text-gray-500">Player</th>
                    <th className="text-right py-2 pr-4 font-medium text-gray-500">Total Spent</th>
                    <th className="text-right py-2 pr-4 font-medium text-gray-500">Lots Won</th>
                    <th className="text-right py-2 font-medium text-gray-500">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {playerSummaries
                    .sort((a, b) => b.totalSpent - a.totalSpent)
                    .map((player, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-2 pr-4 font-medium">{player.name}</td>
                        <td className="py-2 pr-4 text-right font-bold">${player.totalSpent}</td>
                        <td className="py-2 pr-4 text-right">{player.lotsWon}</td>
                        <td className="py-2 text-right text-gray-600">${player.balance}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
