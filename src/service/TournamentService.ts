import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import type { TournamentResults, TeamRoundResult, EliminatedTeam, RoundOpponent } from '../domain/tournamentTypes'

const CACHE_TTL_MS = 5 * 60 * 1000
const NCAA_API_BASE = '/api/ncaa'

type ApiTeam = {
  nameShort?: string
  seed?: number
  winner?: boolean
  isWinner?: boolean
}

type ApiGame = {
  bracketPositionId?: string
  victorBracketPositionId?: string | null
  sectionId: number
  gameState?: string
  teams: ApiTeam[]
}

type ApiResponse = {
  championships: Array<{
    games: ApiGame[]
  }>
}

// Main entry point — returns cached data or fetches fresh
export async function getTournamentResults(year: number): Promise<TournamentResults | null> {
  const ref = doc(db, 'tournamentResults', String(year))
  const snap = await getDoc(ref)

  if (snap.exists()) {
    const cached = snap.data() as TournamentResults
    if (cached.lastUpdated + CACHE_TTL_MS > Date.now()) {
      return cached
    }
  }

  try {
    const results = await fetchFromNcaaApi(year)
    await setDoc(ref, results)
    return results
  } catch {
    // Return stale cache if fetch fails
    if (snap.exists()) {
      return snap.data() as TournamentResults
    }
    return null
  }
}

// Parses NCAA bracket API into TournamentResults using BFS round assignment
async function fetchFromNcaaApi(year: number): Promise<TournamentResults> {
  const res = await fetch(`${NCAA_API_BASE}/${year}`)
  if (!res.ok) throw new Error(`NCAA API error: ${res.status}`)
  const data = (await res.json()) as ApiResponse

  const games = data.championships[0]?.games ?? []

  // Build bracketPositionId → game map
  const positionMap = new Map<string, ApiGame>()
  for (const game of games) {
    if (game.bracketPositionId) {
      positionMap.set(game.bracketPositionId, game)
    }
  }

  // First-round games: sectionId 2–5, seeds sum to 17
  const firstRoundGames = games.filter(
    (g) =>
      g.sectionId >= 2 &&
      g.sectionId <= 5 &&
      g.teams.length === 2 &&
      (g.teams[0].seed ?? 0) + (g.teams[1].seed ?? 0) === 17,
  )

  // BFS to assign rounds and record wins
  const queue: Array<{ game: ApiGame; round: number }> = firstRoundGames.map((g) => ({
    game: g,
    round: 1,
  }))
  const visited = new Set<string>()
  const roundsByTeam = new Map<string, number[]>()
  const opponentsByTeam = new Map<string, RoundOpponent[]>()
  const lostInRound = new Map<string, number>() // key → round they were eliminated in

  while (queue.length > 0) {
    const { game, round } = queue.shift()!

    const posId = game.bracketPositionId
    if (posId) {
      if (visited.has(posId)) continue
      visited.add(posId)
    }

    // Record winner if game is finished
    if (game.gameState === 'F') {
      const winner = game.teams.find((t) => t.winner === true || t.isWinner === true)
      const loser = game.teams.find((t) => t !== winner)
      if (winner?.nameShort && winner.seed != null) {
        const key = `${winner.nameShort}:${winner.seed}`
        const existing = roundsByTeam.get(key) ?? []
        roundsByTeam.set(key, [...existing, round])
        if (loser?.nameShort && loser.seed != null) {
          const opps = opponentsByTeam.get(key) ?? []
          opponentsByTeam.set(key, [...opps, { round, opponentName: loser.nameShort, opponentSeed: loser.seed }])
          lostInRound.set(`${loser.nameShort}:${loser.seed}`, round)
        }
      }
    }

    // Advance to next round via victorBracketPositionId
    if (game.victorBracketPositionId) {
      const nextGame = positionMap.get(game.victorBracketPositionId)
      if (
        nextGame &&
        nextGame.bracketPositionId &&
        !visited.has(nextGame.bracketPositionId)
      ) {
        queue.push({ game: nextGame, round: round + 1 })
      }
    }
  }

  // Build TeamRoundResult array — only teams that have won at least one round
  const teams: TeamRoundResult[] = []
  for (const [key, roundsWon] of roundsByTeam) {
    const colonIdx = key.lastIndexOf(':')
    const name = key.slice(0, colonIdx)
    const seed = parseInt(key.slice(colonIdx + 1), 10)
    const isChampion = roundsWon.includes(6)
    const roundOpponents = opponentsByTeam.get(key) ?? []
    teams.push({ name, seed, roundsWon, isChampion, roundOpponents })
  }

  // Build eliminatedTeams array — teams that have lost a game
  const eliminatedTeams: EliminatedTeam[] = []
  for (const [key, eliminatedInRound] of lostInRound) {
    const colonIdx = key.lastIndexOf(':')
    eliminatedTeams.push({
      name: key.slice(0, colonIdx),
      seed: parseInt(key.slice(colonIdx + 1), 10),
      eliminatedInRound,
    })
  }

  return {
    year,
    lastUpdated: Date.now(),
    teams,
    eliminatedTeams,
  }
}
