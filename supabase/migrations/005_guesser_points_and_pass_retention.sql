-- =============================================================================
-- MIGRATION 005: GUESSER POINTS AND PASS RETENTION
-- Adds two-sided scoring: 10 pts for acting player, 20 pts for guesser.
-- Adds movie retention on pass: failed actor gets 0 pts, next actor acts same movie.
-- Updates round_scoreboard and all_time_scoreboard views accordingly.
-- =============================================================================

-- 1. Alter turns table to record guesser and split points
ALTER TABLE turns
  ADD COLUMN IF NOT EXISTS guesser_id UUID REFERENCES players(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS actor_points INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS guesser_points INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS movie_retained BOOLEAN DEFAULT FALSE;

-- Index guesser_id
CREATE INDEX IF NOT EXISTS idx_turns_guesser_id ON turns(guesser_id);

-- 2. Update complete_turn RPC function with guesser support & pass movie retention
CREATE OR REPLACE FUNCTION complete_turn(
  p_round_id   UUID,
  p_result     turn_result,  -- 'correct' | 'pass' | 'timeout'
  p_guesser_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_round          rounds%ROWTYPE;
  v_turn           turns%ROWTYPE;
  v_actor_pts      INTEGER := 0;
  v_guesser_pts    INTEGER := 0;
  v_elapsed        NUMERIC;
  v_actual_time    INTEGER;
  v_player_count   INTEGER;
  v_next_index     INTEGER;
  v_next_player_id UUID;
  v_next_turn_num  INTEGER;
BEGIN
  -- Lock round
  SELECT * INTO v_round FROM rounds WHERE id = p_round_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Round % not found', p_round_id USING ERRCODE = 'P0001';
  END IF;

  -- Lock current turn
  SELECT * INTO v_turn FROM turns WHERE id = v_round.current_turn_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active turn for round %', p_round_id USING ERRCODE = 'P0002';
  END IF;

  -- IDEMPOTENCY GUARD — turn already completed
  IF v_turn.status IN ('completed', 'timeout', 'cancelled') THEN
    RAISE EXCEPTION 'Turn % already completed (status: %)', v_turn.id, v_turn.status
      USING ERRCODE = 'P0003';
  END IF;

  -- Compute points
  IF p_result = 'correct' THEN
    v_actor_pts := 10;
    IF p_guesser_id IS NOT NULL AND p_guesser_id <> v_turn.player_id THEN
      v_guesser_pts := 20;
    END IF;
  ELSE
    v_actor_pts := 0;
    v_guesser_pts := 0;
  END IF;

  -- Actual time taken
  IF v_round.timer_started_at IS NOT NULL THEN
    v_elapsed := EXTRACT(EPOCH FROM (NOW() - v_round.timer_started_at));
    v_actual_time := LEAST(
      v_round.timer_duration_seconds,
      GREATEST(1, (v_round.timer_duration_seconds - COALESCE(v_round.timer_remaining_seconds, v_round.timer_duration_seconds)) + v_elapsed::INTEGER)
    );
  ELSE
    v_actual_time := 0;
  END IF;

  -- Complete the turn
  UPDATE turns SET
    status           = CASE WHEN p_result = 'timeout' THEN 'timeout'::turn_status ELSE 'completed'::turn_status END,
    result           = p_result,
    guesser_id       = CASE WHEN p_result = 'correct' THEN p_guesser_id ELSE NULL END,
    actor_points     = v_actor_pts,
    guesser_points   = v_guesser_pts,
    points           = v_actor_pts + v_guesser_pts,
    duration_seconds = v_actual_time,
    movie_retained   = (p_result = 'pass'),
    completed_at     = NOW(),
    updated_at       = NOW()
  WHERE id = v_turn.id;

  -- Compute next player in rotation
  SELECT COUNT(*) INTO v_player_count
  FROM game_players
  WHERE game_id = v_round.game_id;

  v_next_index := (v_round.current_player_index + 1) % v_player_count;
  v_next_turn_num := v_round.current_turn_number + 1;

  SELECT player_id INTO v_next_player_id
  FROM game_players
  WHERE game_id = v_round.game_id
    AND player_order = v_next_index;

  -- Advance round state:
  -- IF PASS: current_movie_id REMAINS IDENTICAL for the next player to attempt
  -- IF CORRECT or TIMEOUT: current_movie_id resets to NULL for a fresh selection
  UPDATE rounds SET
    current_player_id       = v_next_player_id,
    current_player_index    = v_next_index,
    current_turn_number     = v_next_turn_num,
    current_movie_id        = CASE WHEN p_result = 'pass' THEN v_round.current_movie_id ELSE NULL END,
    current_turn_id         = NULL,
    movie_revealed          = FALSE,
    timer_state             = 'idle',
    timer_started_at        = NULL,
    timer_paused_at         = NULL,
    timer_remaining_seconds = v_round.timer_duration_seconds,
    turn_started_at         = NULL,
    turn_revealed_at        = NULL,
    last_saved_at           = NOW(),
    updated_at              = NOW()
  WHERE id = p_round_id;

  PERFORM _save_round_checkpoint(p_round_id, 'turn_completed');

  RETURN jsonb_build_object(
    'completed_turn_id', v_turn.id,
    'result', p_result::TEXT,
    'actor_points', v_actor_pts,
    'guesser_points', v_guesser_pts,
    'movie_retained', (p_result = 'pass'),
    'next_player_id', v_next_player_id,
    'next_player_index', v_next_index,
    'next_turn_number', v_next_turn_num
  );
END;
$$;

-- 3. Drop existing views first to allow column reordering/renaming
DROP VIEW IF EXISTS all_time_scoreboard CASCADE;
DROP VIEW IF EXISTS round_scoreboard CASCADE;

-- Rebuild round_scoreboard view to account for both actor and guesser points
CREATE VIEW round_scoreboard AS
WITH actor_scores AS (
  SELECT
    t.round_id,
    t.player_id,
    SUM(COALESCE(t.actor_points, t.points)) AS acting_score,
    COUNT(CASE WHEN t.result = 'correct' THEN 1 END) AS successful_acts,
    COUNT(CASE WHEN t.result = 'pass' THEN 1 END) AS pass_count
  FROM turns t
  GROUP BY t.round_id, t.player_id
),
guesser_scores AS (
  SELECT
    t.round_id,
    t.guesser_id AS player_id,
    SUM(COALESCE(t.guesser_points, 0)) AS guessing_score,
    COUNT(CASE WHEN t.result = 'correct' AND t.guesser_id IS NOT NULL THEN 1 END) AS successful_guesses
  FROM turns t
  WHERE t.guesser_id IS NOT NULL
  GROUP BY t.round_id, t.guesser_id
)
SELECT
  gp.game_id,
  r.id AS round_id,
  r.round_number,
  p.id AS player_id,
  p.name AS player_name,
  p.avatar_color,
  COALESCE(act.acting_score, 0) + COALESCE(gues.guessing_score, 0) AS total_score,
  COALESCE(act.acting_score, 0) AS acting_score,
  COALESCE(gues.guessing_score, 0) AS guessing_score,
  COALESCE(act.successful_acts, 0) AS successful_acts,
  COALESCE(gues.successful_guesses, 0) AS successful_guesses,
  COALESCE(act.pass_count, 0) AS pass_count,
  DENSE_RANK() OVER (
    PARTITION BY r.id
    ORDER BY (COALESCE(act.acting_score, 0) + COALESCE(gues.guessing_score, 0)) DESC,
             COALESCE(gues.successful_guesses, 0) DESC
  ) AS rank
FROM rounds r
JOIN game_players gp ON gp.game_id = r.game_id
JOIN players p ON p.id = gp.player_id
LEFT JOIN actor_scores act ON act.round_id = r.id AND act.player_id = p.id
LEFT JOIN guesser_scores gues ON gues.round_id = r.id AND gues.player_id = p.id;

-- 4. Rebuild all_time_scoreboard view
CREATE VIEW all_time_scoreboard AS
WITH player_round_totals AS (
  SELECT
    rs.game_id,
    rs.player_id,
    rs.player_name,
    rs.avatar_color,
    SUM(rs.total_score) AS cumulative_score,
    SUM(rs.acting_score) AS total_acting_score,
    SUM(rs.guessing_score) AS total_guessing_score,
    SUM(rs.successful_acts) AS total_successful_acts,
    SUM(rs.successful_guesses) AS total_successful_guesses,
    SUM(rs.pass_count) AS total_passes,
    COUNT(DISTINCT rs.round_id) AS rounds_played,
    COUNT(CASE WHEN rs.rank = 1 THEN 1 END) AS rounds_won
  FROM round_scoreboard rs
  GROUP BY rs.game_id, rs.player_id, rs.player_name, rs.avatar_color
)
SELECT
  prt.*,
  DENSE_RANK() OVER (
    PARTITION BY prt.game_id
    ORDER BY prt.cumulative_score DESC, prt.rounds_won DESC
  ) AS rank
FROM player_round_totals prt;

-- 5. Grant permissions on recreated views and updated RPC to anon and authenticated
GRANT SELECT ON round_scoreboard TO anon, authenticated;
GRANT SELECT ON all_time_scoreboard TO anon, authenticated;
GRANT EXECUTE ON FUNCTION complete_turn(UUID, turn_result, UUID) TO anon, authenticated;
