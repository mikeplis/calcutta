import { useState } from 'react'
import { loadHistory } from '../lib/auctionHistory'

export function RecentScreen() {
  const [history] = useState(() => loadHistory())

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 bg-slate-900 text-white px-4 md:px-6 py-3 flex items-center gap-4">
        <a href="/" className="text-slate-400 hover:text-white transition-colors text-sm">← Back</a>
        <h1 className="text-lg font-bold tracking-tight">Recent Auctions</h1>
      </header>
      <div className="max-w-4xl mx-auto px-4 md:px-8 pt-6">
        {history.length === 0 ? (
          <p className="text-slate-500 text-sm">No recent auctions.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((entry) => (
              <li key={entry.auctionId}>
                <a
                  href={`/auction/${entry.auctionId}`}
                  onClick={() => {
                    if (entry.role === 'admin') {
                      sessionStorage.setItem('calcutta-admin-auction-id', entry.auctionId)
                    }
                  }}
                  className="flex items-center justify-between px-4 py-3 bg-white rounded-lg border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all"
                >
                  <div>
                    <span className="text-sm font-medium text-slate-800">
                      {entry.name ?? `#${entry.auctionId.slice(-8)}`}
                    </span>
                    <span className="ml-2 text-xs text-slate-400">
                      {new Date(entry.lastVisited).toLocaleDateString()}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      entry.role === 'admin'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {entry.role === 'admin' ? 'Admin' : 'Participant'}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
