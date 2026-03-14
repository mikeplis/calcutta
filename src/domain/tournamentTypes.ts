export type TeamRoundResult = {
  name: string
  seed: number
  roundsWon: number[] // e.g. [1, 2] = won rounds 1 and 2
  isChampion: boolean
}

export type TournamentResults = {
  year: number
  lastUpdated: number // epoch ms
  teams: TeamRoundResult[]
}
