import { useState } from 'react'

type Props = {
  paused: boolean
  onUndo: () => void
  onForceAdvance: () => void
  onPause: () => void
  onResume: () => void
  onNewAuction: () => void
  canUndo: boolean
}

export function AdminControls({ paused: _paused, onUndo, onForceAdvance, onPause: _onPause, onResume: _onResume, onNewAuction, canUndo }: Props) {
  const [confirmingNew, setConfirmingNew] = useState(false)
  const [confirmingSkip, setConfirmingSkip] = useState(false)

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Admin:</span>
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="px-3 py-1.5 text-sm bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
      >
        Undo
      </button>
      {confirmingSkip ? (
        <>
          <span className="text-sm text-orange-600 font-medium">Are you sure?</span>
          <button
            onClick={() => { onForceAdvance(); setConfirmingSkip(false) }}
            className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
          >
            Yes, skip
          </button>
          <button
            onClick={() => setConfirmingSkip(false)}
            className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
          >
            Cancel
          </button>
        </>
      ) : (
        <button
          onClick={() => setConfirmingSkip(true)}
          className="px-3 py-1.5 text-sm bg-orange-100 text-orange-800 rounded-lg hover:bg-orange-200 font-medium"
        >
          Skip Lot
        </button>
      )}
      {/* TODO: Pause/Resume hidden — triggers a React hooks error */}
      {confirmingNew ? (
        <>
          <span className="text-sm text-red-600 font-medium">Are you sure?</span>
          <button
            onClick={() => { onNewAuction(); setConfirmingNew(false) }}
            className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
          >
            Yes, start over
          </button>
          <button
            onClick={() => setConfirmingNew(false)}
            className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
          >
            Cancel
          </button>
        </>
      ) : (
        <button
          onClick={() => setConfirmingNew(true)}
          className="px-3 py-1.5 text-sm bg-red-100 text-red-800 rounded-lg hover:bg-red-200 font-medium"
        >
          New Auction
        </button>
      )}
    </div>
  )
}
