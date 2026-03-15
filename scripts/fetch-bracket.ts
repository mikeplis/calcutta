import { JSDOM } from 'jsdom'

const BRACKET_URL = 'https://ncaa-api.henrygd.me/brackets/basketball-men/d1'
const STANDINGS_URL = 'https://ncaa-api.henrygd.me/standings/basketball-men/d1'
const LOGO_BASE = 'https://www.ncaa.com'

type BracketRegion = {
  title: string
  sectionId: number
}

type BracketTeam = {
  nameShort: string
  seed: number
  logoUrl: string
}

type BracketGame = {
  sectionId: number
  teams: BracketTeam[]
}

type StandingsTeam = {
  School: string
  'Overall W': string
  'Overall L': string
}

type StandingsConference = {
  conference: string
  standings: StandingsTeam[]
}

type Team = {
  name: string
  seed: number
  region: string
  logoUrl?: string
  record?: string
  conference?: string
  kenpomRank?: number
  kenpomAdjEM?: number
}

type Lot = {
  id: string
  label: string
  teams: Team[]
}

async function fetchBracket(year: number) {
  const res = await fetch(`${BRACKET_URL}/${year}`)
  if (!res.ok) throw new Error(`Failed to fetch bracket: ${res.status}`)
  return res.json()
}

async function fetchStandings(): Promise<Map<string, { record: string; conference: string }>> {
  const res = await fetch(STANDINGS_URL)
  if (!res.ok) throw new Error(`Failed to fetch standings: ${res.status}`)
  const data = await res.json()

  const map = new Map<string, { record: string; conference: string }>()
  for (const conf of data.data as StandingsConference[]) {
    for (const team of conf.standings) {
      const record = `${team['Overall W']}-${team['Overall L']}`
      map.set(team.School, { record, conference: conf.conference })
    }
  }
  return map
}

function extractTeams(bracketData: { championships: [{ games: BracketGame[]; regions: BracketRegion[] }] }): Team[] {
  const champ = bracketData.championships[0]
  const games = champ.games

  // Build section-to-region map from the API's regions array
  const sectionToRegion: Record<number, string> = {}
  for (const r of champ.regions) {
    if (r.title) sectionToRegion[r.sectionId] = r.title
  }

  // First round games in sections 2-5: seeds sum to 17 (1v16, 2v15, etc.)
  const firstRoundGames = games.filter((g: BracketGame) => {
    if (g.sectionId < 2 || g.sectionId > 5) return false
    const seeds = g.teams.map((t) => t.seed)
    return seeds.length === 2 && seeds[0] + seeds[1] === 17
  })

  const teams: Team[] = []
  for (const game of firstRoundGames) {
    const region = sectionToRegion[game.sectionId]
    for (const t of game.teams) {
      teams.push({
        name: t.nameShort,
        seed: t.seed,
        region,
        logoUrl: t.logoUrl ? `${LOGO_BASE}${t.logoUrl}` : undefined,
      })
    }
  }

  return teams
}

// KenPom team name → bracket short name
const KENPOM_ALIASES: Record<string, string> = {
  'Ole Miss': 'Mississippi',
  'UConn': 'Connecticut',
  'Omaha': 'Nebraska Omaha',
  'SIU Edwardsville': 'SIUE',
}

async function fetchKenpom(): Promise<Map<string, { rank: number; adjEM: number }>> {
  try {
    const { readFileSync } = await import('fs')
    const { fileURLToPath } = await import('url')
    const htmlPath = fileURLToPath(new URL('kenpom.html', import.meta.url))
    const html = readFileSync(htmlPath, 'utf-8')
    const doc = new JSDOM(html).window.document
    const map = new Map<string, { rank: number; adjEM: number }>()
    for (const row of doc.querySelectorAll('#ratings-table tbody tr')) {
      const rank = parseInt(row.querySelector('td.hard_left')?.textContent?.trim() ?? '', 10)
      const name = row.querySelector('td.next_left a')?.textContent?.trim() ?? ''
      const adjEM = parseFloat(row.querySelectorAll('td')[4]?.textContent?.trim() ?? '')
      if (!isNaN(rank) && name) map.set(name, { rank, adjEM: isNaN(adjEM) ? 0 : adjEM })
    }
    console.log(`KenPom: fetched ${map.size} rankings`)
    return map
  } catch (e) {
    console.warn('KenPom fetch error — skipping KenPom data:', e)
    return new Map()
  }
}

function enrichWithKenpom(teams: Team[], kenpomMap: Map<string, { rank: number; adjEM: number }>): void {
  let matched = 0
  for (const team of teams) {
    const lookupName = KENPOM_ALIASES[team.name] ?? team.name
    const data = kenpomMap.get(lookupName)
    if (data) {
      team.kenpomRank = data.rank
      team.kenpomAdjEM = data.adjEM
      matched++
    }
  }
  console.log(`KenPom: matched ${matched}/${teams.length} teams`)
  const unmatched = teams.filter((t) => t.kenpomRank === undefined)
  if (unmatched.length) console.warn('KenPom unmatched:', unmatched.map((t) => t.name))
}

// Bracket API and standings API use different name formats for some teams
const NAME_ALIASES: Record<string, string> = {
  "Saint Mary's": "Saint Mary's (CA)",
  "St. John's": "St. John's (NY)",
  'UNC Wilmington': 'UNCW',
  'SIU Edwardsville': 'SIUE',
}

function enrichWithStandings(
  teams: Team[],
  standings: Map<string, { record: string; conference: string }>,
): void {
  for (const team of teams) {
    const lookupName = NAME_ALIASES[team.name] ?? team.name
    const match = standings.get(lookupName)
    if (match) {
      team.record = match.record
      team.conference = match.conference
    }
  }
}

function buildLots(teams: Team[]): Lot[] {
  const lots: Lot[] = []
  const regions = ['East', 'West', 'South', 'Midwest']

  for (const region of regions) {
    const regionTeams = teams.filter((t) => t.region === region)
    const bySeed = new Map<number, Team>()
    for (const t of regionTeams) {
      bySeed.set(t.seed, t)
    }

    // 14/15/16 bundle
    const seed14 = bySeed.get(14)
    const seed15 = bySeed.get(15)
    const seed16 = bySeed.get(16)
    if (seed14 && seed15 && seed16) {
      lots.push({
        id: `${region.toLowerCase()}-14-15-16-seeds`,
        label: `${seed16.name} / ${seed15.name} / ${seed14.name}`,
        teams: [seed16, seed15, seed14],
      })
    }

    // 12/13 bundle
    const seed12 = bySeed.get(12)
    const seed13 = bySeed.get(13)
    if (seed12 && seed13) {
      lots.push({
        id: `${region.toLowerCase()}-12-13-seeds`,
        label: `${seed13.name} / ${seed12.name}`,
        teams: [seed13, seed12],
      })
    }

    // Individual seeds 11 down to 1
    for (let seed = 11; seed >= 1; seed--) {
      const team = bySeed.get(seed)
      if (team) {
        lots.push({
          id: `${region.toLowerCase()}-seed-${seed}`,
          label: team.name,
          teams: [team],
        })
      }
    }
  }

  return lots
}

async function main() {
  const year = parseInt(process.argv[2] ?? new Date().getFullYear().toString(), 10)
  console.log(`Fetching bracket data for ${year}...`)

  const [bracketData, standings, kenpomMap] = await Promise.all([fetchBracket(year), fetchStandings(), fetchKenpom()])

  const teams = extractTeams(bracketData)
  console.log(`Extracted ${teams.length} teams from bracket`)

  enrichWithStandings(teams, standings)
  const matched = teams.filter((t) => t.record).length
  console.log(`Matched ${matched}/${teams.length} teams with standings data`)

  enrichWithKenpom(teams, kenpomMap)

  const lots = buildLots(teams)
  console.log(`Built ${lots.length} lots`)

  const config = {
    players: [],
    lots,
    openerPlayerId: '',
  }

  const outPath = new URL('../public/default-config.json', import.meta.url)
  const { writeFileSync } = await import('fs')
  const { fileURLToPath } = await import('url')
  writeFileSync(fileURLToPath(outPath), JSON.stringify(config, null, 2) + '\n')
  console.log(`Wrote config to public/default-config.json`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
