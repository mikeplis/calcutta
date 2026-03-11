import { useRef } from 'react'
import { useSetupStore } from '../../hooks/useSetupStore'
import { validateConfig } from '../../domain/validation'

export function LotSetup() {
  const { lots, removeLot, updateLotLabel, resetLots, players, openerPlayerId } =
    useSetupStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    const config = { players, lots, openerPlayerId }
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'calcutta-config.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const config = JSON.parse(reader.result as string)
        const error = validateConfig(config)
        if (error) {
          alert(`Invalid config: ${error}`)
          return
        }
        useSetupStore.getState().importConfig(config)
      } catch {
        alert('Invalid JSON file')
      }
    }
    reader.readAsText(file)
    // Reset input so same file can be re-imported
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    useSetupStore.getState().moveLot(index, index - 1)
  }

  const handleMoveDown = (index: number) => {
    if (index === lots.length - 1) return
    useSetupStore.getState().moveLot(index, index + 1)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Lots ({lots.length})</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={resetLots}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Reset to Default
          </button>
          <button
            onClick={handleExport}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Export JSON
          </button>
          <label className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer">
            Import JSON
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {lots.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No lots configured.</p>
      ) : (
        <div className="space-y-1 max-h-[60vh] overflow-y-auto">
          {lots.map((lot, index) => (
            <div
              key={lot.id}
              className="flex items-center gap-2 p-2 rounded border border-gray-100 hover:border-gray-300 group"
            >
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs leading-none"
                  title="Move up"
                >
                  &#9650;
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index === lots.length - 1}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs leading-none"
                  title="Move down"
                >
                  &#9660;
                </button>
              </div>
              <span className="text-gray-400 text-xs w-8">{index + 1}.</span>
              <input
                type="text"
                value={lot.label}
                onChange={(e) => updateLotLabel(lot.id, e.target.value)}
                className="flex-1 px-2 py-1 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded text-sm focus:outline-none"
              />
              <span className="text-xs text-gray-400">
                {lot.teams.length} team{lot.teams.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => removeLot(lot.id)}
                className="text-red-400 hover:text-red-600 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove lot"
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
