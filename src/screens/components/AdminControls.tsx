import { useState } from 'react'

type Props = {
  onUndo: () => void
  onNewAuction: () => void
  canUndo: boolean
}

export function AdminControls({ onUndo, onNewAuction, canUndo }: Props) {
  const [confirmingNew, setConfirmingNew] = useState(false)

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed font-medium"
      >
        Undo
      </button>
      {confirmingNew ? (
        <>
          <span className="text-sm text-red-400 font-medium">Are you sure?</span>
          <button
            onClick={() => { onNewAuction(); setConfirmingNew(false) }}
            className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
          >
            Yes, start over
          </button>
          <button
            onClick={() => setConfirmingNew(false)}
            className="px-3 py-1.5 text-sm bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 font-medium"
          >
            Cancel
          </button>
        </>
      ) : (
        <button
          onClick={() => setConfirmingNew(true)}
          className="px-3 py-1.5 text-sm bg-red-700 hover:bg-red-600 text-white rounded-lg font-medium"
        >
          New Auction
        </button>
      )}
    </div>
  )
}
