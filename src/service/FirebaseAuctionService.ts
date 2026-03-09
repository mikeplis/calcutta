import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  runTransaction,
} from "firebase/firestore"
import { db } from "../firebase"
import { applyAction } from "../domain/logic"
import type { AuctionState, AuctionAction } from "../domain/types"
import type { AuctionService } from "./AuctionService"

/** Strip stateHistory before writing to Firestore (too large, admin-only). */
function toFirestore(state: AuctionState): Omit<AuctionState, "stateHistory"> & { stateHistory: never[] } {
  return { ...state, stateHistory: [] }
}

export class FirebaseAuctionService implements AuctionService {
  private state: AuctionState
  private listeners = new Set<(state: AuctionState) => void>()
  private unsubSnapshot: (() => void) | null = null

  private constructor(state: AuctionState) {
    this.state = state
    this.startListening()
  }

  /** Create a new auction: writes initial state to Firestore and returns the service. */
  static async create(state: AuctionState): Promise<FirebaseAuctionService> {
    const ref = doc(db, "auctions", state.auctionId)
    await setDoc(ref, toFirestore(state))
    return new FirebaseAuctionService(state)
  }

  /** Join an existing auction by ID. Returns null if not found. */
  static async join(auctionId: string): Promise<FirebaseAuctionService | null> {
    const ref = doc(db, "auctions", auctionId)
    const snap = await getDoc(ref)
    if (!snap.exists()) return null
    const data = snap.data() as AuctionState
    // Viewer gets no stateHistory
    return new FirebaseAuctionService({ ...data, stateHistory: [] })
  }

  getState(): AuctionState {
    return this.state
  }

  subscribe(callback: (state: AuctionState) => void): () => void {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

  async dispatch(action: AuctionAction): Promise<void> {
    const ref = doc(db, "auctions", this.state.auctionId)

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref)
      if (!snap.exists()) throw new Error("Auction not found")

      const remote = snap.data() as AuctionState
      // Merge local stateHistory onto remote state (remote has none)
      const merged: AuctionState = {
        ...remote,
        stateHistory: this.state.stateHistory,
      }
      const next = applyAction(merged, action)
      tx.set(ref, toFirestore(next))

      // Update local state immediately so admin sees it before onSnapshot fires
      this.state = next
    })

    this.notifyListeners()
  }

  async claimPlayer(playerId: string, sessionToken: string): Promise<boolean> {
    const ref = doc(db, "auctions", this.state.auctionId)

    let success = false
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref)
      if (!snap.exists()) throw new Error("Auction not found")

      const remote = snap.data() as AuctionState
      const claimed = remote.claimedPlayers ?? {}

      if (claimed[playerId]) {
        success = false
        return
      }

      const updated = { ...claimed, [playerId]: sessionToken }
      tx.update(ref, { claimedPlayers: updated })
      success = true

      this.state = { ...this.state, claimedPlayers: updated }
    })

    if (success) {
      this.notifyListeners()
    }
    return success
  }

  destroy(): void {
    this.unsubSnapshot?.()
    this.unsubSnapshot = null
    this.listeners.clear()
  }

  private startListening(): void {
    const ref = doc(db, "auctions", this.state.auctionId)
    this.unsubSnapshot = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return
      const remote = snap.data() as AuctionState
      // Preserve local stateHistory (not stored in Firestore)
      this.state = { ...remote, stateHistory: this.state.stateHistory }
      this.notifyListeners()
    })
  }

  private notifyListeners(): void {
    for (const cb of this.listeners) {
      cb(this.state)
    }
  }
}
