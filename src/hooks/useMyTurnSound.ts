import { useEffect, useRef } from 'react'

type Snapshot = { activePlayerId: string | null; lotIndex: number } | undefined

export function useMyTurnSound(
  activePlayerId: string | null,
  currentPlayerId: string | null,
  currentLotIndex: number,
) {
  const prevRef = useRef<Snapshot>(undefined) // undefined = not yet initialized

  useEffect(() => {
    if (prevRef.current === undefined) {
      prevRef.current = { activePlayerId, lotIndex: currentLotIndex }
      return
    }
    const lotChanged = currentLotIndex !== prevRef.current.lotIndex
    const playerChanged = activePlayerId !== prevRef.current.activePlayerId
    if (activePlayerId === currentPlayerId && (playerChanged || lotChanged)) {
      playDing()
    }
    prevRef.current = { activePlayerId, lotIndex: currentLotIndex }
  }, [activePlayerId, currentPlayerId, currentLotIndex])
}

function playDing() {
  const ctx = new AudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.frequency.value = 880
  osc.type = 'sine'
  gain.gain.setValueAtTime(0.4, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.25)
  osc.onended = () => ctx.close()
}
