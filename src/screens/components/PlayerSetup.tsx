import { useState } from 'react'
import { useSetupStore } from '../../hooks/useSetupStore'

export function PlayerSetup() {
  const {
    players,
    defaultBalance,
    addPlayer,
    removePlayer,
    movePlayer,
    updatePlayerName,
    setDefaultBalance,
  } = useSetupStore()

  const [newName, setNewName] = useState('')

  const handleAdd = () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    addPlayer(trimmed)
    setNewName('')
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Players</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Default balance:</label>
          <input
            type="number"
            value={defaultBalance}
            onChange={(e) => setDefaultBalance(Number(e.target.value))}
            min={1}
            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
          />
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Player name"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={handleAdd}
          disabled={!newName.trim()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>

      {players.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No players added yet.</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {players.map((player, index) => (
            <div
              key={player.id}
              className="flex flex-wrap items-center gap-2 py-3 px-2"
            >
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => movePlayer(player.id, 'up')}
                  disabled={index === 0}
                  className="text-slate-300 hover:text-slate-500 disabled:opacity-0 leading-none text-xs"
                  title="Move up"
                >
                  ▲
                </button>
                <button
                  onClick={() => movePlayer(player.id, 'down')}
                  disabled={index === players.length - 1}
                  className="text-slate-300 hover:text-slate-500 disabled:opacity-0 leading-none text-xs"
                  title="Move down"
                >
                  ▼
                </button>
              </div>
              <input
                type="text"
                value={player.name}
                onChange={(e) => updatePlayerName(player.id, e.target.value)}
                className="min-w-0 flex-1 basis-32 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                onClick={() => removePlayer(player.id)}
                className="text-slate-400 hover:text-red-500 transition-colors text-base leading-none px-1"
                title="Remove player"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
