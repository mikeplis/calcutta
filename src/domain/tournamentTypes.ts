export type RoundOpponent = {
  round: number
  opponentName: string
  opponentSeed: number
}

export type TeamRoundResult = {
  name: string
  seed: number
  roundsWon: number[] // e.g. [1, 2] = won rounds 1 and 2
  isChampion: boolean
  roundOpponents?: RoundOpponent[] // opponent defeated in each round
}

export type TournamentResults = {
  year: number
  lastUpdated: number // epoch ms
  teams: TeamRoundResult[]
}
