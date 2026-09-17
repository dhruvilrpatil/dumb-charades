// =============================================================================
// GAME REPOSITORY
// Typed wrapper over Supabase RPCs and table queries.
// React components never call supabase directly — they go through here.
// =============================================================================

import { supabase } from './supabase'
import type {
  Game,
  GameSettings,
  Player,
  GamePlayer,
  Round,
  RoundHistoryRow,
  RoundScoreboardRow,
  AllTimeScoreboardRow,
  RoundResumeState,
  CompleteTurnResult,
  AvailableMovie,
  TurnResult,
} from './database.types'

// ---------------------------------------------------------------------------
// HELPER
// ---------------------------------------------------------------------------
function assertOk<T>(data: T | null, error: unknown, context: string): T {
  if (error) throw new Error(`[gameRepository] ${context}: ${String(error)}`)
  if (data === null || data === undefined) throw new Error(`[gameRepository] ${context}: no data returned`)
  return data
}


// ---------------------------------------------------------------------------
// PLAYERS
// ---------------------------------------------------------------------------

/** Create a new persistent player and return their id. */
export async function createPlayer(name: string, avatarColor: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_player', {
    p_name: name,
    p_avatar_color: avatarColor,
  })
  return assertOk(data, error, 'createPlayer')
}

/** Fetch a player by id. */
export async function getPlayer(playerId: string): Promise<Player> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .single()
  return assertOk(data, error, 'getPlayer')
}


// ---------------------------------------------------------------------------
// GAMES
// ---------------------------------------------------------------------------

/** Create a new game tournament with settings. Returns game id. */
export async function createGame(settings: GameSettings): Promise<string> {
  const { data, error } = await supabase.rpc('create_game', {
    p_settings: settings,
  })
  return assertOk(data, error, 'createGame')
}

/** Fetch full game record. */
export async function getGame(gameId: string): Promise<Game> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single()
  return assertOk(data, error, 'getGame')
}

/** Update game settings (e.g., era/difficulty/duration). */
export async function updateGameSettings(gameId: string, settings: Partial<GameSettings>): Promise<void> {
  const game = await getGame(gameId)
  const merged = { ...game.settings, ...settings }
  const { error } = await supabase
    .from('games')
    .update({ settings: merged })
    .eq('id', gameId)
  if (error) throw new Error(`[gameRepository] updateGameSettings: ${error.message}`)
}


// ---------------------------------------------------------------------------
// GAME PLAYERS
// ---------------------------------------------------------------------------

/** Add a player to a game with optional order index. */
export async function addPlayerToGame(
  gameId: string,
  playerId: string,
  order?: number
): Promise<string> {
  const { data, error } = await supabase.rpc('add_player_to_game', {
    p_game_id: gameId,
    p_player_id: playerId,
    p_order: order ?? null,
  })
  return assertOk(data, error, 'addPlayerToGame')
}

/** Remove a player from a game (before the game starts). */
export async function removePlayerFromGame(gameId: string, playerId: string): Promise<void> {
  const { error } = await supabase
    .from('game_players')
    .delete()
    .eq('game_id', gameId)
    .eq('player_id', playerId)
  if (error) throw new Error(`[gameRepository] removePlayerFromGame: ${error.message}`)
}

/** Fetch all players in a game, ordered by player_order. */
export async function getGamePlayers(
  gameId: string
): Promise<Array<GamePlayer & { player: Player }>> {
  const { data, error } = await supabase
    .from('game_players')
    .select('*, player:players(*)')
    .eq('game_id', gameId)
    .order('player_order', { ascending: true })
  return assertOk(data, error, 'getGamePlayers') as Array<GamePlayer & { player: Player }>
}


// ---------------------------------------------------------------------------
// ROUNDS
// ---------------------------------------------------------------------------

/** Start a new round in the game. Returns round id. */
export async function startRound(gameId: string): Promise<string> {
  const { data, error } = await supabase.rpc('start_round', { p_game_id: gameId })
  return assertOk(data, error, 'startRound')
}

/** Fetch a single round record. */
export async function getRound(roundId: string): Promise<Round> {
  const { data, error } = await supabase
    .from('rounds')
    .select('*')
    .eq('id', roundId)
    .single()
  return assertOk(data, error, 'getRound')
}

/** Mark round as completed (preserves all history). */
export async function completeRound(roundId: string): Promise<void> {
  const { error } = await supabase.rpc('complete_round', { p_round_id: roundId })
  if (error) throw new Error(`[gameRepository] completeRound: ${error.message}`)
}

/**
 * Reopen a completed or paused round from its last checkpoint.
 * Returns the full resume state.
 */
export async function resumeRound(roundId: string): Promise<RoundResumeState> {
  const { data, error } = await supabase.rpc('resume_round', { p_round_id: roundId })
  return assertOk(data, error, 'resumeRound') as RoundResumeState
}


// ---------------------------------------------------------------------------
// TURN LIFECYCLE
// ---------------------------------------------------------------------------

/** Begin a turn: select player and movie, start timer clock. Returns turn id. */
export async function startTurn(
  roundId: string,
  playerId: string,
  movieId: string
): Promise<string> {
  const { data, error } = await supabase.rpc('start_turn', {
    p_round_id: roundId,
    p_player_id: playerId,
    p_movie_id: movieId,
  })
  return assertOk(data, error, 'startTurn')
}

/**
 * Actor reveals the film. Starts the server-side timer.
 * After this call, timer reconstruction formula is:
 *   remaining = timer_remaining_seconds - (now - timer_started_at)
 */
export async function revealMovie(roundId: string): Promise<void> {
  const { error } = await supabase.rpc('reveal_movie', { p_round_id: roundId })
  if (error) throw new Error(`[gameRepository] revealMovie: ${error.message}`)
}

/**
 * Pause the timer. Returns the exact remaining seconds stored in the DB.
 */
export async function pauseTurn(roundId: string): Promise<number> {
  const { data, error } = await supabase.rpc('pause_turn', { p_round_id: roundId })
  return assertOk(data, error, 'pauseTurn') as number
}

/**
 * Resume a paused timer. A fresh timer_started_at is written so reconstruction works.
 */
export async function resumeTurn(roundId: string): Promise<void> {
  const { error } = await supabase.rpc('resume_turn', { p_round_id: roundId })
  if (error) throw new Error(`[gameRepository] resumeTurn: ${error.message}`)
}

/**
 * Complete the current turn with a result and optional guesser.
 * - If result is 'correct', actor gets 10 pts, guesser gets 20 pts.
 * - If result is 'pass', actor gets 0 pts, and movie is retained for next actor.
 */
export async function completeTurn(
  roundId: string,
  result: TurnResult,
  guesserId?: string | null
): Promise<CompleteTurnResult> {
  const { data, error } = await supabase.rpc('complete_turn', {
    p_round_id: roundId,
    p_result: result,
    p_guesser_id: guesserId ?? null,
  })
  return assertOk(data, error, 'completeTurn') as CompleteTurnResult
}


// ---------------------------------------------------------------------------
// RESUME & HISTORY
// ---------------------------------------------------------------------------

/**
 * Fetch the full resume state for a round, including server-computed remaining timer.
 * Call on page load / browser restore.
 */
export async function getRoundResumeState(roundId: string): Promise<RoundResumeState> {
  const { data, error } = await supabase.rpc('get_round_resume_state', {
    p_round_id: roundId,
  })
  return assertOk(data, error, 'getRoundResumeState') as RoundResumeState
}

/**
 * Fetch all rounds for a game, ordered by round_number.
 * Powers the Round History / Resume Screen.
 */
export async function getRoundHistory(gameId: string): Promise<RoundHistoryRow[]> {
  const { data, error } = await supabase
    .from('round_history')
    .select('*')
    .eq('game_id', gameId)
    .order('round_number', { ascending: true })
  return assertOk(data, error, 'getRoundHistory')
}

/**
 * Get the scoreboard for a specific round.
 */
export async function getRoundScoreboard(roundId: string): Promise<RoundScoreboardRow[]> {
  const { data, error } = await supabase
    .from('round_scoreboard')
    .select('*')
    .eq('round_id', roundId)
    .order('rank', { ascending: true })
  return assertOk(data, error, 'getRoundScoreboard')
}

/**
 * Get all-time scores for all players in a game.
 */
export async function getAllTimeScoreboard(gameId: string): Promise<AllTimeScoreboardRow[]> {
  const { data, error } = await supabase
    .from('all_time_scoreboard')
    .select('*')
    .eq('game_id', gameId)
    .order('rank', { ascending: true })
  return assertOk(data, error, 'getAllTimeScoreboard')
}


// ---------------------------------------------------------------------------
// MOVIES
// ---------------------------------------------------------------------------

/**
 * Get a random available movie (not yet used in this game), respecting filters.
 * Resets usage pool if all movies have been played.
 */
export async function getAvailableMovie(
  gameId: string,
  era: string = 'all',
  difficulty: string = 'all'
): Promise<AvailableMovie> {
  const { data, error } = await supabase.rpc('get_available_movie', {
    p_game_id: gameId,
    p_era: era,
    p_difficulty: difficulty,
  })
  return assertOk(data, error, 'getAvailableMovie') as AvailableMovie
}


// ---------------------------------------------------------------------------
// PERSISTENCE HELPERS
// ---------------------------------------------------------------------------

/**
 * Persist the game_id to localStorage so it survives page reload.
 * This is the ONLY thing stored in localStorage — all game state is in Supabase.
 */
export const STORAGE_KEY = 'damsharas_game_id'

export function saveGameId(gameId: string): void {
  localStorage.setItem(STORAGE_KEY, gameId)
}

export function loadGameId(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

export function clearGameId(): void {
  localStorage.removeItem(STORAGE_KEY)
}
