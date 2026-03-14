import { useState, useEffect, useCallback } from 'react'
import type { TournamentResults } from '../domain/tournamentTypes'
import { getTournamentResults } from '../service/TournamentService'

const REFRESH_INTERVAL_MS = 5 * 60 * 1000

export function useTournamentResults(year: number): {
  results: TournamentResults | null
  loading: boolean
  error: string | null
  refresh: () => void
} {
  const [results, setResults] = useState<TournamentResults | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setLoading(true)
    setError(null)
    getTournamentResults(year)
      .then((data) => {
        setResults(data)
        setLoading(false)
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Failed to load tournament results')
        setLoading(false)
      })
  }, [year])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [refresh])

  return { results, loading, error, refresh }
}
