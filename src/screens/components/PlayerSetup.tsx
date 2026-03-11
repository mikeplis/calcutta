import { useState } from 'react'
import { useSetupStore } from '../../hooks/useSetupStore'

export function PlayerSetup() {
  const {
    players,
    openerPlayerId,
    defaultBalance,
    addPlayer,
    removePlayer,
    updatePlayerName,
    updatePlayerBalance,
    setDefaultBalance,
    setOpener,
  } = useSetupStore()

  const [newName, setNewName] = useState('')

  const handleAdd = () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    addPlayer(trimmed)
    setNewName('')
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleAdd}
          disabled={!newName.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>

      {players.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No players added yet.</p>
      ) : (
        <div className="space-y-2">
          {players.map((player, index) => (
            <div
              key={player.id}
              className={`flex flex-wrap items-center gap-2 p-3 rounded-lg border ${
                player.id === openerPlayerId
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-200'
              }`}
            >
              <span className="text-gray-400 text-sm w-6">{index + 1}.</span>
              <input
                type="text"
                value={player.name}
                onChange={(e) => updatePlayerName(player.id, e.target.value)}
                className="min-w-0 flex-1 basis-32 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-500">$</span>
                <input
                  type="number"
                  value={player.balance}
                  onChange={(e) => updatePlayerBalance(player.id, Number(e.target.value))}
                  min={0}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <button
                onClick={() => setOpener(player.id)}
                className={`text-xs px-2 py-1 rounded whitespace-nowrap ${
                  player.id === openerPlayerId
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Set as first opener"
              >
                {player.id === openerPlayerId ? 'Opener' : 'Set opener'}
              </button>
              <button
                onClick={() => removePlayer(player.id)}
                className="text-red-500 hover:text-red-700 text-sm whitespace-nowrap"
                title="Remove player"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
