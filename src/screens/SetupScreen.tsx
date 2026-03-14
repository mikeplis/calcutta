import { useState } from 'react'
import { useSetupStore } from '../hooks/useSetupStore'
import { PlayerSetup } from './components/PlayerSetup'
import { LotSetup } from './components/LotSetup'

export function SetupScreen({ onStart }: { onStart: () => void }) {
  const { players, lots, testMode, setTestMode } = useSetupStore()
  const [activeTab, setActiveTab] = useState<'players' | 'lots'>('players')

  const canStart = players.length >= 2 && lots.length >= 1
  const [starting, setStarting] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 bg-slate-900 text-white px-4 md:px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-tight">Calcutta Auction</h1>
      </header>
      <div className="max-w-4xl mx-auto px-4 md:px-8 pt-4">
        <p className="text-slate-500 text-sm mt-1 mb-4">Configure players and lots before starting the auction.</p>

        <div className="flex border-b border-slate-200 mb-6">
          <button
            onClick={() => setActiveTab('players')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'players'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Players ({players.length})
          </button>
          <button
            onClick={() => setActiveTab('lots')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'lots'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Lots ({lots.length})
          </button>
        </div>

        {activeTab === 'players' ? <PlayerSetup /> : <LotSetup />}

        <div className="mt-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <span className="relative inline-flex items-center">
                <input
                  type="checkbox"
                  checked={testMode}
                  onChange={(e) => setTestMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-slate-300 peer-checked:bg-indigo-600 rounded-full transition-colors peer-focus:ring-2 peer-focus:ring-indigo-500 peer-focus:ring-offset-1"></div>
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4"></div>
              </span>
              <span className="text-sm text-slate-700">
                Test mode
                <span className="text-slate-400 ml-1">(solo testing, no player claiming)</span>
              </span>
            </label>
            <button
              onClick={() => { setStarting(true); onStart() }}
              disabled={!canStart || starting}
              className={`w-full sm:w-auto px-10 py-3 rounded-lg font-bold text-lg transition-colors ${
                canStart && !starting
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              {starting ? 'Starting…' : 'Start Auction'}
            </button>
          </div>
          {!canStart && !testMode && (
            <p className="text-right text-sm text-slate-500 mt-2">
              Need at least 2 players and 1 lot to start.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
