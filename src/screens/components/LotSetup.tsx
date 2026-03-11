import { useRef } from 'react'
import { useSetupStore } from '../../hooks/useSetupStore'
import { validateConfig } from '../../domain/validation'

export function LotSetup() {
  const { lots, resetLots, players, openerPlayerId, loading } = useSetupStore()
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

      {loading ? (
        <p className="text-gray-500 text-center py-4">Loading lots...</p>
      ) : lots.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No lots configured.</p>
      ) : (
        <div className="space-y-1 max-h-[60vh] overflow-y-auto">
          {lots.map((lot, index) => (
            <div
              key={lot.id}
              className="flex items-center gap-2 p-2 rounded border border-gray-100"
            >
              <span className="text-gray-400 text-xs w-8">{index + 1}.</span>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                {lot.teams.length === 1 && lot.teams[0].logoUrl && (
                  <img
                    src={lot.teams[0].logoUrl}
                    alt=""
                    className="w-5 h-5 object-contain drop-shadow-[0_0_1px_rgba(0,0,0,0.3)]"
                  />
                )}
                <div>
                  <div className="text-sm font-medium text-gray-900">{lot.label}</div>
                  <div className="text-xs text-gray-400">
                    {lot.teams.map((t) =>
                      `${t.region} #${t.seed}${t.record ? ` · ${t.record}` : ''}${t.conference ? ` · ${t.conference}` : ''}`
                    ).join(' / ')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
