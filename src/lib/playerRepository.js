// =============================================================================
// PLAYER REPOSITORY
// Persistent player management across browser refreshes and Supabase DB sync.
// Combines instant zero-latency localStorage cache with real-time Supabase sync.
// =============================================================================

import { supabase, isSupabaseConfigured } from './supabase'
import { getPlayerColor } from '../game/gameUtils'

const PLAYERS_CACHE_KEY = 'damsharas_players_v2'
const REMOVED_PLAYERS_KEY = 'damsharas_removed_player_ids_v2'

function getRemovedPlayerIds() {
  try {
    const raw = localStorage.getItem(REMOVED_PLAYERS_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function addRemovedPlayerId(id) {
  try {
    const set = getRemovedPlayerIds()
    set.add(id)
    localStorage.setItem(REMOVED_PLAYERS_KEY, JSON.stringify([...set]))
  } catch (e) {
    console.warn(e)
  }
}

function clearRemovedPlayerId(id) {
  try {
    const set = getRemovedPlayerIds()
    set.delete(id)
    localStorage.setItem(REMOVED_PLAYERS_KEY, JSON.stringify([...set]))
  } catch (e) {
    console.warn(e)
  }
}

export const DEFAULT_PLAYERS = [
  {
    id: 'p1',
    name: 'Raj',
    color: getPlayerColor(0),
    score: 0,
    guessedCount: 0,
    passCount: 0,
  },
  {
    id: 'p2',
    name: 'Simran',
    color: getPlayerColor(1),
    score: 0,
    guessedCount: 0,
    passCount: 0,
  },
  {
    id: 'p3',
    name: 'Kabir',
    color: getPlayerColor(2),
    score: 0,
    guessedCount: 0,
    passCount: 0,
  },
]

/**
 * Generate a valid UUID v4 (browser & node compatible)
 */
export function generateUuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Read cached players from localStorage for zero-latency initial render
 */
export function getCachedPlayers() {
  try {
    const raw = localStorage.getItem(PLAYERS_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
    }
    return null
  } catch (e) {
    console.warn('[playerRepository] Failed to read cached players:', e)
    return null
  }
}

/**
 * Save players to localStorage
 */
export function saveCachedPlayers(players) {
  try {
    if (Array.isArray(players)) {
      localStorage.setItem(PLAYERS_CACHE_KEY, JSON.stringify(players))
    }
  } catch (e) {
    console.warn('[playerRepository] Failed to cache players:', e)
  }
}

/**
 * Check if the 'score' column is supported on Supabase players table
 */
let _supportsScoreColumn = null
async function checkScoreColumnSupport() {
  if (_supportsScoreColumn !== null) return _supportsScoreColumn
  if (!supabase || !isSupabaseConfigured) {
    _supportsScoreColumn = false
    return false
  }
  try {
    const { error } = await supabase.from('players').select('score').limit(1)
    _supportsScoreColumn = !error
    return _supportsScoreColumn
  } catch {
    _supportsScoreColumn = false
    return false
  }
}

/**
 * Load players from Supabase DB, with fallback to localStorage
 */
export async function loadPlayers() {
  const cached = getCachedPlayers()
  const removedIds = getRemovedPlayerIds()

  if (!supabase || !isSupabaseConfigured) {
    return cached || DEFAULT_PLAYERS
  }

  try {
    const hasScore = await checkScoreColumnSupport()
    const selectQuery = hasScore
      ? 'id, name, avatar_color, score, guessed_count, pass_count, created_at'
      : 'id, name, avatar_color, created_at'

    const { data, error } = await supabase
      .from('players')
      .select(selectQuery)
      .order('created_at', { ascending: true })

    if (error) {
      console.warn('[playerRepository] Error loading players from DB, using cache:', error.message)
      return cached || DEFAULT_PLAYERS
    }

    if (data && data.length > 0) {
      const activeRows = data.filter((row) => !removedIds.has(row.id))
      if (activeRows.length > 0) {
        const mapped = activeRows.map((row, idx) => ({
          id: row.id,
          name: row.name,
          color: row.avatar_color || getPlayerColor(idx),
          score: typeof row.score === 'number' ? row.score : (cached?.find((c) => c.id === row.id)?.score || 0),
          guessedCount: typeof row.guessed_count === 'number' ? row.guessed_count : (cached?.find((c) => c.id === row.id)?.guessedCount || 0),
          passCount: typeof row.pass_count === 'number' ? row.pass_count : (cached?.find((c) => c.id === row.id)?.passCount || 0),
        }))

        saveCachedPlayers(mapped)
        return mapped
      }
    }

    // If DB has no active players yet, seed with cached or default players
    const initialToSeed = cached && cached.length > 0 ? cached : DEFAULT_PLAYERS
    await seedPlayersToDb(initialToSeed)
    return initialToSeed
  } catch (e) {
    console.error('[playerRepository] Exception loading players:', e)
    return cached || DEFAULT_PLAYERS
  }
}

/**
 * Seed initial players into DB
 */
async function seedPlayersToDb(playersToSeed) {
  if (!supabase || !isSupabaseConfigured) return
  try {
    const hasScore = await checkScoreColumnSupport()
    for (let i = 0; i < playersToSeed.length; i++) {
      const p = playersToSeed[i]
      const payload = {
        name: p.name,
        avatar_color: p.color || getPlayerColor(i),
      }
      if (hasScore) {
        payload.score = p.score || 0
        payload.guessed_count = p.guessedCount || 0
        payload.pass_count = p.passCount || 0
      }
      await supabase.from('players').insert(payload)
    }
  } catch (e) {
    console.warn('[playerRepository] Could not seed players to DB:', e)
  }
}

/**
 * Add a new player to DB and cache
 */
export async function addPlayer(name, color) {
  const localId = generateUuid()
  const newPlayer = {
    id: localId,
    name: name.trim(),
    color: color || '#0070f3',
    score: 0,
    guessedCount: 0,
    passCount: 0,
  }

  if (supabase && isSupabaseConfigured) {
    try {
      const hasScore = await checkScoreColumnSupport()
      const payload = {
        name: newPlayer.name,
        avatar_color: newPlayer.color,
      }
      if (hasScore) {
        payload.score = 0
        payload.guessed_count = 0
        payload.pass_count = 0
        payload.is_active = true
      }

      const { data, error } = await supabase
        .from('players')
        .insert(payload)
        .select()
        .single()

      if (!error && data?.id) {
        newPlayer.id = data.id
        clearRemovedPlayerId(data.id)
      } else if (error) {
        console.warn('[playerRepository] DB insert failed, using local ID:', error.message)
      }
    } catch (e) {
      console.warn('[playerRepository] DB insert exception:', e)
    }
  }

  return newPlayer
}

/**
 * Remove a player from DB and cache
 */
export async function removePlayer(playerId) {
  addRemovedPlayerId(playerId)

  if (supabase && isSupabaseConfigured) {
    try {
      // 1. Attempt physical delete
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', playerId)

      if (error) {
        console.warn('[playerRepository] DB delete error:', error.message)
      }

      // 2. Also attempt update is_active: false if supported
      await supabase
        .from('players')
        .update({ is_active: false })
        .eq('id', playerId)
    } catch (e) {
      console.warn('[playerRepository] DB delete exception:', e)
    }
  }
}

/**
 * Update player scores in DB and cache
 */
export async function updatePlayerScores(players) {
  saveCachedPlayers(players)

  if (!supabase || !isSupabaseConfigured) return

  try {
    const hasScore = await checkScoreColumnSupport()
    if (!hasScore) return // Score column not yet created in Supabase; stored safely in cache

    // Update each player's score and counters in Supabase
    for (const p of players) {
      // Only update if id looks like a valid UUID (not temporary p1/p2 or has been inserted)
      if (p.id && p.id.length > 10) {
        await supabase
          .from('players')
          .update({
            score: p.score || 0,
            guessed_count: p.guessedCount || 0,
            pass_count: p.passCount || 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', p.id)
      }
    }
  } catch (e) {
    console.warn('[playerRepository] DB score update exception:', e)
  }
}

/**
 * Reset all player scores in DB to 0
 */
export async function resetPlayerScores(players) {
  const resetPlayers = players.map((p) => ({
    ...p,
    score: 0,
    guessedCount: 0,
    passCount: 0,
  }))

  saveCachedPlayers(resetPlayers)

  if (!supabase || !isSupabaseConfigured) return resetPlayers

  try {
    const hasScore = await checkScoreColumnSupport()
    if (hasScore) {
      for (const p of resetPlayers) {
        if (p.id && p.id.length > 10) {
          await supabase
            .from('players')
            .update({
              score: 0,
              guessed_count: 0,
              pass_count: 0,
              updated_at: new Date().toISOString(),
            })
            .eq('id', p.id)
        }
      }
    }
  } catch (e) {
    console.warn('[playerRepository] DB score reset exception:', e)
  }

  return resetPlayers
}
