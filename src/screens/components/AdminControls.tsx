import { useState } from 'react'

type Props = {
  onUndo: () => void
  onNewAuction: () => void
  onSkipAll: () => void
  canUndo: boolean
  testMode: boolean
}

export function AdminControls({ onUndo, onNewAuction, onSkipAll, canUndo, testMode }: Props) {
  const [confirming, setConfirming] = useState<'new' | 'skipAll' | null>(null)

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed font-medium"
      >
        Undo
      </button>
      {confirming === 'skipAll' ? (
        <>
          <span className="text-sm text-yellow-400 font-medium">Randomly assign remaining lots?</span>
          <button
            onClick={() => { onSkipAll(); setConfirming(null) }}
            className="px-3 py-1.5 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium"
          >
            Yes, simulate
          </button>
          <button
            onClick={() => setConfirming(null)}
            className="px-3 py-1.5 text-sm bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 font-medium"
          >
            Cancel
          </button>
        </>
      ) : confirming === 'new' ? (
        <>
          <span className="text-sm text-red-400 font-medium">Are you sure?</span>
          <button
            onClick={() => { onNewAuction(); setConfirming(null) }}
            className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
          >
            Yes, start over
          </button>
          <button
            onClick={() => setConfirming(null)}
            className="px-3 py-1.5 text-sm bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 font-medium"
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          {testMode && (
            <button
              onClick={() => setConfirming('skipAll')}
              className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium"
            >
              Simulate
            </button>
          )}
          <button
            onClick={() => setConfirming('new')}
            className="px-3 py-1.5 text-sm bg-red-700 hover:bg-red-600 text-white rounded-lg font-medium"
          >
            New Auction
          </button>
        </>
      )}
    </div>
  )
}
