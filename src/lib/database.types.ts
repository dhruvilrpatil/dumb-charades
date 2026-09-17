// =============================================================================
// DATABASE TYPES — Dumb Charades Bollywood Edition
// Auto-generated shape. Replace with: supabase gen types typescript --project-id YOUR_ID
// =============================================================================

export type GameStatus   = 'lobby' | 'active' | 'paused' | 'completed'
export type RoundStatus  = 'not_started' | 'active' | 'paused' | 'completed'
export type TurnStatus   = 'pending' | 'active' | 'completed' | 'timeout' | 'cancelled'
export type TurnResult   = 'correct' | 'pass' | 'timeout'
export type MovieEra     = '80s' | '90s' | '2000s'
export type MovieDiff    = 'easy' | 'medium' | 'hard' | 'bizarre'
export type TimerState   = 'idle' | 'running' | 'paused' | 'expired'

export interface GameSettings {
  turn_duration: 60 | 90 | 120
  era: 'all' | '80s' | '90s' | '2000s'
  difficulty: 'all' | 'easy' | 'medium' | 'hard' | 'bizarre'
}

// ---------------------------------------------------------------------------
// TABLE ROW TYPES
// ---------------------------------------------------------------------------

export interface Player {
  id: string
  name: string
  avatar_color: string
  created_at: string
  updated_at: string
}

export interface Movie {
  id: string
  title: string
  year: number
  era: MovieEra
  difficulty: MovieDiff
  language?: string
  actors?: string[]
  created_at: string
}

export interface Game {
  id: string
  status: GameStatus
  current_round_id: string | null
  settings: GameSettings
  created_at: string
  updated_at: string
}

export interface GamePlayer {
  id: string
  game_id: string
  player_id: string
  player_order: number
  joined_at: string
}

export interface Round {
  id: string
  game_id: string
  round_number: number
  status: RoundStatus

  current_player_id: string | null
  current_player_index: number
  current_turn_number: number
  current_movie_id: string | null
  current_turn_id: string | null

  movie_revealed: boolean

  timer_duration_seconds: number
  timer_remaining_seconds: number | null
  timer_state: TimerState
  timer_started_at: string | null
  timer_paused_at: string | null

  turn_started_at: string | null
  turn_revealed_at: string | null

  last_saved_at: string
  round_state: RoundStateSnapshot

  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface Turn {
  id: string
  round_id: string
  player_id: string
  guesser_id?: string | null
  movie_id: string
  turn_number: number

  status: TurnStatus
  result: TurnResult | null
  points: number
  actor_points?: number
  guesser_points?: number
  movie_retained?: boolean

  duration_seconds: number | null

  started_at: string | null
  revealed_at: string | null
  paused_at: string | null
  completed_at: string | null

  created_at: string
  updated_at: string
}

export interface RoundMovieUsage {
  id: string
  game_id: string
  round_id: string
  movie_id: string
  turn_id: string | null
  used_at: string
}

// ---------------------------------------------------------------------------
// JSONB SHAPES
// ---------------------------------------------------------------------------

export interface RoundStateSnapshot {
  phase?: string
  currentPlayerIndex?: number
  currentTurnNumber?: number
  movie?: { id: string | null; revealed: boolean }
  timer?: {
    duration: number
    remaining: number
    status: TimerState
    startedAt: string | null
    pausedAt: string | null
  }
  scores?: Record<string, number>          // player_id → total points
  statistics?: {
    moviesGuessed: number
    passes: number
    timeouts: number
    totalTurns: number
    totalTurnTime: number
  }
}

// ---------------------------------------------------------------------------
// RPC RETURN TYPES
// ---------------------------------------------------------------------------

/** Returned by get_round_resume_state() */
export interface RoundResumeState {
  round: {
    id: string
    gameId: string
    roundNumber: number
    status: RoundStatus
    currentPlayerIndex: number
    currentTurnNumber: number
    movieRevealed: boolean
    lastSavedAt: string
  }
  currentPlayer: {
    id: string | null
    index: number
  }
  currentMovie: Pick<Movie, 'id' | 'title' | 'year' | 'era' | 'difficulty'> | null
  currentTurn: {
    id: string
    status: TurnStatus
    result: TurnResult | null
    startedAt: string | null
    revealedAt: string | null
  } | null
  timer: {
    durationSeconds: number
    remainingSeconds: number   // server-computed, accounting for elapsed time
    state: TimerState
    startedAt: string | null
    pausedAt: string | null
    isExpired: boolean
  }
  scores: Record<string, number>           // player_id → points
  players: Array<{
    id: string
    name: string
    avatarColor: string
    order: number
  }>
  roundState: RoundStateSnapshot
}

/** Returned by complete_turn() */
export interface CompleteTurnResult {
  result: TurnResult
  points: number
  actor_points?: number
  guesser_points?: number
  nextPlayerIndex: number
  nextTurnNumber: number
}

/** Returned by get_available_movie() */
export type AvailableMovie = Pick<Movie, 'id' | 'title' | 'year' | 'era' | 'difficulty'>

// ---------------------------------------------------------------------------
// VIEW TYPES
// ---------------------------------------------------------------------------

export interface RoundScoreboardRow {
  round_id: string
  game_id: string
  player_id: string
  player_name: string
  avatar_color: string
  player_order?: number
  total_score: number
  score?: number
  acting_score?: number
  guessing_score?: number
  successful_acts?: number
  successful_guesses?: number
  movies_guessed?: number
  passes?: number
  pass_count?: number
  timeouts?: number
  average_time_seconds?: number | null
  rank: number
}

export interface AllTimeScoreboardRow {
  game_id?: string
  player_id: string
  player_name: string
  avatar_color: string
  cumulative_score: number
  total_points?: number
  total_acting_score?: number
  total_guessing_score?: number
  total_successful_acts?: number
  total_successful_guesses?: number
  rounds_played: number
  rounds_won?: number
  movies_guessed?: number
  passes?: number
  total_passes?: number
  timeouts?: number
  average_time_seconds?: number | null
  rank: number
}

export interface RoundHistoryRow {
  round_id: string
  game_id: string
  round_number: number
  status: RoundStatus
  started_at: string | null
  completed_at: string | null
  last_saved_at: string

  current_player_id: string | null
  current_player_name: string | null
  current_turn_number: number
  current_movie_id: string | null
  current_movie_title: string | null
  movie_revealed: boolean

  timer_state: TimerState
  timer_remaining_seconds: number | null
  timer_started_at: string | null
  timer_paused_at: string | null
  timer_duration_seconds: number
  computed_remaining_seconds: number | null

  round_winner_name: string | null
  total_round_points: number
  correct_count: number
  pass_count: number
  timeout_count: number
  is_current: boolean
}

// ---------------------------------------------------------------------------
// DATABASE — Full typed schema (for supabase client)
// ---------------------------------------------------------------------------
export interface Database {
  public: {
    Tables: {
      players:           { Row: Player;           Insert: Omit<Player, 'id'|'created_at'|'updated_at'>; Update: Partial<Player> }
      movies:            { Row: Movie;             Insert: Omit<Movie, 'id'|'created_at'>;              Update: Partial<Movie> }
      games:             { Row: Game;              Insert: Omit<Game, 'id'|'created_at'|'updated_at'>;  Update: Partial<Game> }
      game_players:      { Row: GamePlayer;        Insert: Omit<GamePlayer, 'id'|'joined_at'>;          Update: Partial<GamePlayer> }
      rounds:            { Row: Round;             Insert: Omit<Round, 'id'|'created_at'|'updated_at'>; Update: Partial<Round> }
      turns:             { Row: Turn;              Insert: Omit<Turn, 'id'|'created_at'|'updated_at'>;  Update: Partial<Turn> }
      round_movie_usage: { Row: RoundMovieUsage;   Insert: Omit<RoundMovieUsage, 'id'|'used_at'>;       Update: Partial<RoundMovieUsage> }
    }
    Views: {
      round_scoreboard:    { Row: RoundScoreboardRow }
      all_time_scoreboard: { Row: AllTimeScoreboardRow }
      round_history:       { Row: RoundHistoryRow }
    }
    Functions: {
      create_player:           { Args: { p_name: string; p_avatar_color?: string }; Returns: string }
      create_game:             { Args: { p_settings?: GameSettings };               Returns: string }
      add_player_to_game:      { Args: { p_game_id: string; p_player_id: string; p_order?: number }; Returns: string }
      start_round:             { Args: { p_game_id: string };                        Returns: string }
      start_turn:              { Args: { p_round_id: string; p_player_id: string; p_movie_id: string }; Returns: string }
      reveal_movie:            { Args: { p_round_id: string };                       Returns: void }
      pause_turn:              { Args: { p_round_id: string };                       Returns: number }
      resume_turn:             { Args: { p_round_id: string };                       Returns: void }
      complete_turn:           { Args: { p_round_id: string; p_result: TurnResult }; Returns: CompleteTurnResult }
      complete_round:          { Args: { p_round_id: string };                       Returns: void }
      resume_round:            { Args: { p_round_id: string };                       Returns: RoundResumeState }
      get_round_resume_state:  { Args: { p_round_id: string };                       Returns: RoundResumeState }
      get_available_movie:     { Args: { p_game_id: string; p_era?: string; p_difficulty?: string }; Returns: AvailableMovie }
    }
    Enums: {
      game_status:  GameStatus
      round_status: RoundStatus
      turn_status:  TurnStatus
      turn_result:  TurnResult
      movie_era:    MovieEra
      movie_diff:   MovieDiff
      timer_state:  TimerState
    }
  }
}
