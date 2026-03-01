import { useEffect, useState } from 'react'

type Props = {
  winner: string
  amount: number
  lotLabel: string
  onDismiss: () => void
}

export function SoldBanner({ winner, amount, lotLabel, onDismiss }: Props) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      onDismiss()
    }, 3000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  if (!visible) return null

  return (
    <div
      onClick={() => { setVisible(false); onDismiss() }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 cursor-pointer"
    >
      <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-sm mx-4 animate-bounce-in">
        <div className="text-sm text-gray-500 uppercase tracking-wide mb-1">{lotLabel}</div>
        <div className="text-3xl font-extrabold text-green-700 mb-2">SOLD</div>
        <div className="text-lg text-gray-900">
          to <span className="font-bold text-blue-600">{winner}</span>
        </div>
        <div className="text-2xl font-bold text-green-700 mt-1">${amount}</div>
      </div>
    </div>
  )
}
