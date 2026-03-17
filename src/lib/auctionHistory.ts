export type AuctionHistoryEntry = {
  auctionId: string
  name?: string
  lastVisited: number // Date.now()
  role: 'admin' | 'participant'
}

const KEY = 'calcutta-auction-history'
const MAX = 20

export function loadHistory(): AuctionHistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    return JSON.parse(raw) as AuctionHistoryEntry[]
  } catch {
    return []
  }
}

export function addToHistory(entry: AuctionHistoryEntry): void {
  const existing = loadHistory().filter((e) => e.auctionId !== entry.auctionId)
  const updated = [entry, ...existing].slice(0, MAX)
  localStorage.setItem(KEY, JSON.stringify(updated))
}
