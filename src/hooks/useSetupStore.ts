import { create } from 'zustand'
import type { Player, Lot } from '../domain/types'
import { generateDefaultLots } from '../domain/defaults'

type SetupState = {
  players: Player[]
  lots: Lot[]
  openerPlayerId: string
  defaultBalance: number
  addPlayer: (name: string) => void
  removePlayer: (id: string) => void
  updatePlayerName: (id: string, name: string) => void
  updatePlayerBalance: (id: string, balance: number) => void
  setDefaultBalance: (balance: number) => void
  setOpener: (playerId: string) => void
  setLots: (lots: Lot[]) => void
  moveLot: (fromIndex: number, toIndex: number) => void
  removeLot: (id: string) => void
  updateLotLabel: (id: string, label: string) => void
  resetLots: () => void
  importConfig: (config: { players: Player[]; lots: Lot[]; openerPlayerId: string }) => void
  exportConfig: () => { players: Player[]; lots: Lot[]; openerPlayerId: string }
}

let nextPlayerId = 1

export const useSetupStore = create<SetupState>((set, get) => ({
  players: [],
  lots: generateDefaultLots(),
  openerPlayerId: '',
  defaultBalance: 100,

  addPlayer: (name) => {
    const id = `player-${nextPlayerId++}`
    set((s) => {
      const newPlayer: Player = { id, name, balance: s.defaultBalance, lotsWon: [] }
      const newPlayers = [...s.players, newPlayer]
      return {
        players: newPlayers,
        openerPlayerId: s.openerPlayerId || id,
      }
    })
  },

  removePlayer: (id) =>
    set((s) => {
      const newPlayers = s.players.filter((p) => p.id !== id)
      return {
        players: newPlayers,
        openerPlayerId: s.openerPlayerId === id
          ? (newPlayers[0]?.id ?? '')
          : s.openerPlayerId,
      }
    }),

  updatePlayerName: (id, name) =>
    set((s) => ({
      players: s.players.map((p) => (p.id === id ? { ...p, name } : p)),
    })),

  updatePlayerBalance: (id, balance) =>
    set((s) => ({
      players: s.players.map((p) => (p.id === id ? { ...p, balance } : p)),
    })),

  setDefaultBalance: (balance) => set({ defaultBalance: balance }),

  setOpener: (playerId) => set({ openerPlayerId: playerId }),

  setLots: (lots) => set({ lots }),

  moveLot: (fromIndex, toIndex) =>
    set((s) => {
      const lots = [...s.lots]
      const [moved] = lots.splice(fromIndex, 1)
      lots.splice(toIndex, 0, moved)
      return { lots }
    }),

  removeLot: (id) =>
    set((s) => ({ lots: s.lots.filter((l) => l.id !== id) })),

  updateLotLabel: (id, label) =>
    set((s) => ({
      lots: s.lots.map((l) => (l.id === id ? { ...l, label } : l)),
    })),

  resetLots: () => set({ lots: generateDefaultLots() }),

  importConfig: (config) =>
    set({
      players: config.players,
      lots: config.lots,
      openerPlayerId: config.openerPlayerId,
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
