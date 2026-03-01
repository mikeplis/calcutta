export function validateConfig(config: unknown): string | null {
  if (typeof config !== 'object' || config === null) {
    return 'Config must be an object'
  }

  const c = config as Record<string, unknown>

  // Validate players
  if (!Array.isArray(c.players)) {
    return 'Missing or invalid "players" array'
  }
  const playerIds = new Set<string>()
  for (let i = 0; i < c.players.length; i++) {
    const p = c.players[i]
    if (typeof p !== 'object' || p === null) {
      return `Player at index ${i} must be an object`
    }
    const player = p as Record<string, unknown>
    if (typeof player.id !== 'string' || player.id === '') {
      return `Player at index ${i} has invalid or missing "id"`
    }
    if (typeof player.name !== 'string' || player.name === '') {
      return `Player at index ${i} has invalid or missing "name"`
    }
    if (typeof player.balance !== 'number' || player.balance < 0) {
      return `Player at index ${i} has invalid "balance" (must be number >= 0)`
    }
    if (!Array.isArray(player.lotsWon)) {
      return `Player at index ${i} has invalid or missing "lotsWon" array`
    }
    if (playerIds.has(player.id)) {
      return `Duplicate player ID: "${player.id}"`
    }
    playerIds.add(player.id)
  }

  // Validate lots
  if (!Array.isArray(c.lots)) {
    return 'Missing or invalid "lots" array'
  }
  const lotIds = new Set<string>()
  for (let i = 0; i < c.lots.length; i++) {
    const l = c.lots[i]
    if (typeof l !== 'object' || l === null) {
      return `Lot at index ${i} must be an object`
    }
    const lot = l as Record<string, unknown>
    if (typeof lot.id !== 'string' || lot.id === '') {
      return `Lot at index ${i} has invalid or missing "id"`
    }
    if (typeof lot.label !== 'string') {
      return `Lot at index ${i} has invalid or missing "label"`
    }
    if (!Array.isArray(lot.teams) || lot.teams.length === 0) {
      return `Lot at index ${i} must have a non-empty "teams" array`
    }
    if (lotIds.has(lot.id)) {
      return `Duplicate lot ID: "${lot.id}"`
    }
    lotIds.add(lot.id)
  }

  // Validate openerPlayerId
  if (typeof c.openerPlayerId !== 'string') {
    return 'Missing or invalid "openerPlayerId"'
  }
  if (c.openerPlayerId !== '' && !playerIds.has(c.openerPlayerId)) {
    return `openerPlayerId "${c.openerPlayerId}" does not reference a valid player ID`
  }

  return null
}
