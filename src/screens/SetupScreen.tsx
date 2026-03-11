import { useState } from 'react'
import { useSetupStore } from '../hooks/useSetupStore'
import { PlayerSetup } from './components/PlayerSetup'
import { LotSetup } from './components/LotSetup'

export function SetupScreen({ onStart }: { onStart: () => void }) {
  const { players, lots, openerPlayerId, testMode, setTestMode } = useSetupStore()
  const [activeTab, setActiveTab] = useState<'players' | 'lots'>('players')

  const canStart = players.length >= 2 && lots.length >= 1 && openerPlayerId !== ''

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Calcutta Auction Setup</h1>
        <p className="text-gray-600 mb-6">Configure players and lots before starting the auction.</p>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('players')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'players'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Players ({players.length})
          </button>
          <button
            onClick={() => setActiveTab('lots')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'lots'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Lots ({lots.length})
          </button>
        </div>

        {activeTab === 'players' ? <PlayerSetup /> : <LotSetup />}

        <div className="mt-8 flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={testMode}
              onChange={(e) => setTestMode(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
            />
            Test mode
            <span className="text-gray-400">(solo testing, no player claiming)</span>
          </label>
          <button
            onClick={onStart}
            disabled={!canStart}
            className={`px-8 py-3 rounded-lg font-bold text-lg transition-colors ${
              canStart
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Start Auction
          </button>
        </div>
        {!canStart && (
          <p className="text-right text-sm text-gray-500 mt-2">
            Need at least 2 players and 1 lot to start.
          </p>
        )}
      </div>
    </div>
  )
}
