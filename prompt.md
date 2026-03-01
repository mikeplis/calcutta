Here's the revised prompt:

Build a March Madness Calcutta Auction Web App
You are building a production-quality web application for running a "Calcutta" auction draft for March Madness. This is a real app that will be used by a real group of ~10-14 people, so treat it as such — not a demo or prototype.
Follow strict test-driven development: write domain logic and tests first, get them passing, then build the UI on top. Do not write UI code until core logic tests are green.

What is a Calcutta?
A Calcutta is an auction-style draft. Every March Madness team (or bundle of teams called a "lot") is auctioned off in a fixed order. Players bid fake money on lots. The highest bidder wins the lot and their balance is reduced. Winners earn points later based on how their teams perform (scoring is out of scope for this build). The goal of this app is to run the live auction itself.

Auction rules — implement these exactly:

Each player starts with a budget set by the admin (default: $1000)
Lots are auctioned in a fixed pre-set order
The player who won the previous lot opens bidding on the next lot. The first lot's opener is determined by the admin during setup
The opening bidder must place a bid — they cannot pass. The minimum opening bid is $1
After the opener bids, play proceeds clockwise (by player order). On their turn, each remaining player may raise the current bid by at least $1 or pass
Once a player passes, they are out of bidding for the current lot only
A player is automatically skipped if their remaining balance is less than the minimum next bid (current high bid + $1). They are treated as having passed
When only one player remains (everyone else has passed or been skipped), that player wins the lot at their current bid. Their balance is reduced accordingly
The winner opens bidding on the next lot
Edge case: if the opener cannot afford $1, skip them and move to the next player in order who can. Keep this logic simple — in practice someone always bids


Architecture — this is the most important part of the codebase:
The app must support two modes, and the transition between them must not require a refactor:
Mode 1 (build this now): Single-device local mode. One person (the admin) runs everything from one screen. State lives in memory + localStorage. Players don't have their own devices.
Mode 2 (design for this, implement the seam, but don't build it yet): Multi-device real-time mode. Each player opens a unique URL on their own device. They see their balance, their lots won, and can place bids when it's their turn. The admin controls the auction from their own view. This requires real-time state sync (Supabase Realtime or equivalent).
How to achieve this:
Define a AuctionService interface that all React components talk to. It must support:

getState(): AuctionState
subscribe(callback: (state: AuctionState) => void): () => void
dispatch(action: AuctionAction): Promise<void>

Build a LocalAuctionService that implements this interface using in-memory state + localStorage. Design AuctionAction as a discriminated union (like Redux actions) so that actions can trivially be sent over a wire to Supabase later. The Supabase implementation will just be: client sends action to an edge function → edge function validates and applies it → broadcasts new state via Realtime. The local version does all three steps in-process. This seam should be so clean that adding Supabase is purely additive — no existing files should need modification, only a new service implementation and a config flag.

Domain model — define these types first:
tstype Player = {
  id: string
  name: string
  balance: number
  lotsWon: string[] // lot IDs
}

type Team = {
  name: string
  seed: number
  region: string
}

type Lot = {
  id: string
  label: string // e.g. "East 16/15 Seeds" or "Duke"
  teams: Team[]
}

type Bid = {
  playerId: string
  amount: number
  timestamp: number
}

type LotAuctionState =
  | { status: 'pending' }
  | { status: 'active'; currentBid: Bid; passedPlayerIds: string[]; openerId: string }
  | { status: 'sold'; winnerId: string; finalBid: number }
  | { status: 'skipped' }

type AuctionState = {
  auctionId: string
  players: Player[]
  lots: Lot[]
  lotStates: Record<string, LotAuctionState>
  currentLotIndex: number
  phase: 'setup' | 'active' | 'complete'
  openerPlayerId: string // who opens the current lot
  adminId: string
}

Pure logic layer — test this exhaustively before touching React:
All auction logic lives in pure functions with zero side effects. Examples:

getNextBidder(state, currentBidderId) — returns next player who hasn't passed and can afford the next bid
isValidBid(state, playerId, amount) — validates bid amount, player turn, player balance
applyAction(state, action) — pure reducer, returns new state
getCurrentLot(state) — returns active lot
getEligibleBidders(state) — players who haven't passed and can afford to raise
isLotOver(state) — true when one or zero eligible bidders remain

Write Vitest unit tests for all of these, covering:

Normal bid flow
Pass tracking and turn rotation
Auto-skip when player can't afford next bid
Lot resolution (winner determination, balance deduction)
Advancing to next lot and resetting pass state
Opener-must-bid rule
Budget exhaustion mid-auction
Edge case: opener can't afford to open


Pre-populated default lot template:
The app should ship with a sensible default lot configuration that the admin can edit. Use this structure as the default:

Round 1 bundles (by region — 4 regions: East, West, South, Midwest):

"[Region] 15/16 Seeds" — bundle of 2 teams
"[Region] 13/14 Seeds" — bundle of 2 teams


Individual lots (by seed, within each region):

Seeds 1 through 12, one lot per team



This gives 8 bundle lots + 48 individual lots = 56 lots total. Admin can fully edit this before the auction starts — reorder, rename, re-bundle, add or remove lots.
The lot setup screen should allow import/export as JSON so the admin can save and reuse a configuration year over year.

UI screens:
1. Setup Screen (admin only)

Add/remove/reorder players, set each player's starting balance
Configure lot order (drag to reorder, edit lot names, bundle/unbundle teams)
Set the opening bidder for the first lot
Import/export config as JSON
"Start Auction" button — locked until at least 2 players and 1 lot exist

2. Auction Screen — the main event
Design this to be legible on a laptop screen shared on a TV or projector, as well as on individual mobile devices. Prioritize information density and readability.
Must show at all times:

Current lot name and team(s) with seed and region
Current high bid amount and who holds it
Whose turn it is to bid (highlighted clearly)
Which players have passed on this lot (visually distinct)
All players with their remaining balances
Whether each player is eligible to bid or auto-skipped

Bidding controls (shown only to the active bidder in multi-device mode; shown to admin in local mode):

Bid input pre-filled with current high bid + $1
Raise button
Pass button (disabled for opener on first action)

Admin controls (always visible to admin):

Undo last action (revert to previous state snapshot)
Force-advance to next lot (in case of error)
Pause/resume auction

3. Lot History Panel
Collapsible sidebar or bottom panel showing all completed lots with winner name and final price.
4. Summary Screen
Shown when all lots are auctioned. Table showing: lot, teams, winner, price paid. Player totals: total spent, lots won. Export as CSV.

Tech stack:

React + TypeScript (Vite)
Tailwind CSS
Zustand for local state (works well with the service abstraction pattern)
Vitest + React Testing Library
React Router for screen navigation
Deployable to Vercel or Netlify as a static site with no required backend (for Mode 1)


Development order — follow this strictly:

Define all TypeScript types
Write pure auction logic functions
Write Vitest unit tests for all logic — aim for full coverage of meaningful cases
Make tests pass
Implement AuctionService interface + LocalAuctionService
Write integration tests for the service layer
Build Setup Screen
Build Auction Screen
Build Summary Screen
Wire up routing
Polish: loading states, error boundaries, responsive layout

Do not skip ahead. Do not write UI before logic tests are green.

Code quality expectations:

No any types
All components under 150 lines — extract logic to hooks and helpers
Co-locate tests with source files (*.test.ts alongside *.ts)
All action types in a single discriminated union — no stringly-typed events
Service layer must be injectable (passed via React context) so tests can swap in a mock


Start by creating the TypeScript domain model and the pure logic layer with full test coverage. Output the file structure you plan to use before writing any code, and confirm it before proceeding. Make small commits after every self-contained unit of work is complete so the progression can be easily followed
