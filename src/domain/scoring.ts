import type { AuctionState, Player } from './types'
import type { TournamentResults } from './tournamentTypes'

function teamKey(name: string, seed: number): string {
  return `${name}:${seed}`
}

// Returns playerId → total points earned so far
export function calculatePlayerPoints(
  state: AuctionState,
  results: TournamentResults,
): Record<string, number> {
  const resultMap = new Map(results.teams.map((t) => [teamKey(t.name, t.seed), t]))

  const points: Record<string, number> = {}
  for (const player of state.players) {
    let total = 0
    for (const lotId of player.lotsWon) {
      const lot = state.lots.find((l) => l.id === lotId)
      if (!lot) continue
      for (const team of lot.teams) {
        const result = resultMap.get(teamKey(team.name, team.seed))
        if (!result) continue
        for (const round of result.roundsWon) {
          total += team.seed * round
        }
      }
    }
    points[player.id] = total
  }

  return points
}

export type PointsBreakdownEntry = {
  teamName: string
  seed: number
  points: number
}

export type PlayerLeaderboardEntry = {
  player: Player
  points: number
  breakdown: PointsBreakdownEntry[]
}

// Returns sorted leaderboard with per-team breakdown
export function getPointsLeaderboard(
  state: AuctionState,
  results: TournamentResults,
): PlayerLeaderboardEntry[] {
  const resultMap = new Map(results.teams.map((t) => [teamKey(t.name, t.seed), t]))

  const leaderboard = state.players.map((player) => {
    const breakdown: PointsBreakdownEntry[] = []
    let totalPoints = 0

    for (const lotId of player.lotsWon) {
      const lot = state.lots.find((l) => l.id === lotId)
      if (!lot) continue
      for (const team of lot.teams) {
        const result = resultMap.get(teamKey(team.name, team.seed))
        const teamPoints = result ? result.roundsWon.reduce((sum, round) => sum + team.seed * round, 0) : 0
        breakdown.push({ teamName: team.name, seed: team.seed, points: teamPoints })
        totalPoints += teamPoints
      }
    }

    return { player, points: totalPoints, breakdown }
  })

  return leaderboard.sort((a, b) => b.points - a.points)
}

// Returns the player who owns the tournament champion, or null
export function getTournamentWinnerOwner(
  state: AuctionState,
  results: TournamentResults,
): Player | null {
  const champion = results.teams.find((t) => t.isChampion)
  if (!champion) return null

  for (const player of state.players) {
    for (const lotId of player.lotsWon) {
      const lot = state.lots.find((l) => l.id === lotId)
      if (!lot) continue
      if (lot.teams.some((t) => t.name === champion.name && t.seed === champion.seed)) {
        return player
      }
    }
  }

  return null
}
