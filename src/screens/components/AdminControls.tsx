import { useState } from 'react'

type Props = {
  onUndo: () => void
  onNewAuction: () => void
  canUndo: boolean
}

export function AdminControls({ onUndo, onNewAuction, canUndo }: Props) {
  const [confirmingNew, setConfirmingNew] = useState(false)

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
