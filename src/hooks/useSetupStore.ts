import { create } from 'zustand'
import type { Player, Lot } from '../domain/types'
import { generateDefaultLots, loadDefaultConfig } from '../domain/defaults'

type SetupState = {
  players: Player[]
  lots: Lot[]
  openerPlayerId: string
  defaultBalance: number
  loading: boolean
  testMode: boolean
  addPlayer: (name: string) => void
  removePlayer: (id: string) => void
  movePlayer: (id: string, direction: 'up' | 'down') => void
  updatePlayerName: (id: string, name: string) => void
  setDefaultBalance: (balance: number) => void
  setLots: (lots: Lot[]) => void
  resetLots: () => void
  setTestMode: (enabled: boolean) => void
  importConfig: (config: { players: Player[]; lots: Lot[]; openerPlayerId: string }) => void
  exportConfig: () => { players: Player[]; lots: Lot[]; openerPlayerId: string }
}

let nextPlayerId = 1

export const useSetupStore = create<SetupState>((set, get) => ({
  players: [],
  lots: generateDefaultLots(),
  openerPlayerId: '',
  defaultBalance: 100,
  loading: true,
  testMode: false,

  addPlayer: (name) => {
    const id = `player-${nextPlayerId++}`
    set((s) => {
      // Deduplicate name if it already exists
      let finalName = name
      const existingNames = new Set(s.players.map((p) => p.name))
      if (existingNames.has(finalName)) {
        let suffix = 2
        while (existingNames.has(`${name} ${suffix}`)) suffix++
        finalName = `${name} ${suffix}`
      }
      const newPlayer: Player = { id, name: finalName, balance: s.defaultBalance, lotsWon: [] }
      const newPlayers = [...s.players, newPlayer]
      return {
        players: newPlayers,
        openerPlayerId: newPlayers[0]?.id ?? '',
      }
    })
  },

  removePlayer: (id) =>
    set((s) => {
      const newPlayers = s.players.filter((p) => p.id !== id)
      return {
        players: newPlayers,
        openerPlayerId: newPlayers[0]?.id ?? '',
      }
    }),

  movePlayer: (id, direction) =>
    set((s) => {
      const idx = s.players.findIndex((p) => p.id === id)
      if (idx === -1) return s
      const newPlayers = [...s.players]
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= newPlayers.length) return s
      ;[newPlayers[idx], newPlayers[swapIdx]] = [newPlayers[swapIdx], newPlayers[idx]]
      return { players: newPlayers, openerPlayerId: newPlayers[0]?.id ?? '' }
    }),

  updatePlayerName: (id, name) =>
    set((s) => ({
      players: s.players.map((p) => (p.id === id ? { ...p, name } : p)),
    })),

  setDefaultBalance: (balance) => set({ defaultBalance: balance }),

  setTestMode: (enabled) => set({ testMode: enabled }),

  setLots: (lots) => set({ lots }),

  resetLots: () => {
    loadDefaultConfig().then((config) => {
      useSetupStore.setState({ lots: config.lots })
    })
  },

  importConfig: (config) =>
    set({
      players: config.players,
      lots: config.lots,
      openerPlayerId: config.openerPlayerId || config.players[0]?.id || '',
    }),

  exportConfig: () => {
    const s = get()
    return {
      players: s.players,
      lots: s.lots,
      openerPlayerId: s.openerPlayerId,
    }
  },
}))

// Load default config asynchronously on startup
loadDefaultConfig().then((config) => {
  useSetupStore.setState({
    lots: config.lots,
    loading: false,
  })
})
