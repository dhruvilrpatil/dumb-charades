// =============================================================================
// STORAGE UTILITIES
// Manages saved rounds by timestamp, round resumption, and all-time scoreboard.
// Works seamlessly in offline/local mode and provides persistence across sessions.
// =============================================================================

const SAVED_ROUNDS_KEY = 'damsharas_saved_rounds_v2'
const ALL_TIME_SCORES_KEY = 'damsharas_all_time_scoreboard_v2'

/**
 * Format timestamp nicely into e.g. "Sep 17, 2026 · 01:25 PM"
 */
export function formatTimestamp(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date()
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }) + ' · ' + d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Get all saved rounds sorted by timestamp (newest first).
 */
export function getSavedRounds() {
  try {
    const raw = localStorage.getItem(SAVED_ROUNDS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
  } catch (e) {
    console.error('[storageUtils] Failed to get saved rounds:', e)
    return []
  }
}

/**
 * Save or update a round session.
 */
export function saveRoundSession(roundData) {
  try {
    const rounds = getSavedRounds()
    const now = Date.now()
    const id = roundData.id || `round-${now}-${Math.random().toString(36).substring(2, 6)}`

    const session = {
      id,
      timestamp: roundData.timestamp || now,
      savedAt: formatTimestamp(roundData.timestamp || now),
      status: roundData.status || 'in_progress', // 'in_progress' | 'completed'
      roundNumber: roundData.roundNumber || 1,
      turnNumber: roundData.turnNumber || 1,
      playerIndex: roundData.playerIndex || 0,
      players: roundData.players || [],
      currentMovie: roundData.currentMovie || null,
      usedMovieIds: roundData.usedMovieIds || [],
      settings: roundData.settings || { duration: 60, era: 'All Eras', difficulty: 'All Difficulties' },
      turnLogs: roundData.turnLogs || [],
    }

    const existingIdx = rounds.findIndex((r) => r.id === id)
    if (existingIdx >= 0) {
      rounds[existingIdx] = session
    } else {
      rounds.unshift(session)
    }

    // Keep maximum 30 saved rounds
    const trimmed = rounds.slice(0, 30)
    localStorage.setItem(SAVED_ROUNDS_KEY, JSON.stringify(trimmed))

    // Update all-time aggregates whenever a round is saved or completed
    updateAllTimeScoreboard(session)

    return session
  } catch (e) {
    console.error('[storageUtils] Failed to save round session:', e)
    return null
  }
}

/**
 * Get the latest active resumable round, if any.
 */
export function getLatestResumableRound() {
  const rounds = getSavedRounds()
  return rounds.find((r) => r.status === 'in_progress') || null
}

/**
 * Delete a saved round by ID.
 */
export function deleteSavedRound(roundId) {
  try {
    const rounds = getSavedRounds().filter((r) => r.id !== roundId)
    localStorage.setItem(SAVED_ROUNDS_KEY, JSON.stringify(rounds))
    return true
  } catch (e) {
    console.error('[storageUtils] Failed to delete round:', e)
    return false
  }
}

/**
 * Internal helper to update all-time player stats.
 */
function updateAllTimeScoreboard(session) {
  try {
    const raw = localStorage.getItem(ALL_TIME_SCORES_KEY)
    const scoreboard = raw ? JSON.parse(raw) : {}

    // Aggregate stats from session players & turn logs
    if (session.players && Array.isArray(session.players)) {
      session.players.forEach((p) => {
        const key = p.name.trim().toLowerCase()
        if (!scoreboard[key]) {
          scoreboard[key] = {
            id: p.id,
            name: p.name,
            color: p.color,
            totalScore: 0,
            actingScore: 0,
            guessingScore: 0,
            successfulActs: 0,
            successfulGuesses: 0,
            roundsPlayed: 0,
            roundsWon: 0,
            totalTurns: 0,
            lastPlayedAt: session.timestamp,
          }
        }
      })
    }

    // Recompute total lifetime stats across all saved rounds
    const allRounds = getSavedRounds()
    const aggregated = {}

    allRounds.forEach((rnd) => {
      // Find winner of this round if finished
      const sortedRoundPlayers = [...(rnd.players || [])].sort((a, b) => b.score - a.score)
      const winnerId = sortedRoundPlayers[0]?.id

      rnd.players?.forEach((p) => {
        const key = p.name.trim().toLowerCase()
        if (!aggregated[key]) {
          aggregated[key] = {
            id: p.id,
            name: p.name,
            color: p.color,
            totalScore: 0,
            actingScore: 0,
            guessingScore: 0,
            successfulActs: 0,
            successfulGuesses: 0,
            roundsPlayed: 0,
            roundsWon: 0,
            totalTurns: 0,
            lastPlayedAt: rnd.timestamp,
          }
        }
        aggregated[key].totalScore += p.score || 0
        aggregated[key].roundsPlayed += 1
        if (p.id === winnerId && (p.score || 0) > 0 && rnd.status === 'completed') {
          aggregated[key].roundsWon += 1
        }
      })

      // Credit acting and guessing from logs
      rnd.turnLogs?.forEach((log) => {
        if (log.actorName) {
          const aKey = log.actorName.trim().toLowerCase()
          if (aggregated[aKey]) {
            aggregated[aKey].actingScore += log.actorPoints || 0
            if (log.result === 'correct') aggregated[aKey].successfulActs += 1
            aggregated[aKey].totalTurns += 1
          }
        }
        if (log.guesserName && log.result === 'correct') {
          const gKey = log.guesserName.trim().toLowerCase()
          if (aggregated[gKey]) {
            aggregated[gKey].guessingScore += log.guesserPoints || 20
            aggregated[gKey].successfulGuesses += 1
          }
        }
      })
    })

    localStorage.setItem(ALL_TIME_SCORES_KEY, JSON.stringify(aggregated))
  } catch (e) {
    console.error('[storageUtils] Failed to update all-time scoreboard:', e)
  }
}

/**
 * Fetch sorted all-time scoreboard rankings.
 */
export function getAllTimeScoreboard() {
  try {
    const raw = localStorage.getItem(ALL_TIME_SCORES_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    const list = Object.values(data)
    return list.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
  } catch (e) {
    console.error('[storageUtils] Failed to get all-time scoreboard:', e)
    return []
  }
}

/**
 * Reset all-time scoreboard and reset round cumulative stats.
 */
export function resetAllTimeScoreboard() {
  try {
    localStorage.removeItem(ALL_TIME_SCORES_KEY)
    const rounds = getSavedRounds()
    const clearedRounds = rounds.map((r) => ({
      ...r,
      players: (r.players || []).map((p) => ({ ...p, score: 0, guessedCount: 0, passCount: 0 })),
      turnLogs: [],
    }))
    localStorage.setItem(SAVED_ROUNDS_KEY, JSON.stringify(clearedRounds))
    return true
  } catch (e) {
    console.error('[storageUtils] Failed to reset all-time scoreboard:', e)
    return false
  }
}

/**
 * Clear all saved rounds and scoreboard (if user requests hard reset).
 */
export function clearAllStorage() {
  try {
    localStorage.removeItem(SAVED_ROUNDS_KEY)
    localStorage.removeItem(ALL_TIME_SCORES_KEY)
    return true
  } catch (e) {
    return false
  }
}

