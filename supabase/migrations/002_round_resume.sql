-- =============================================================================
-- MIGRATION 002: ROUND RESUME — ATOMIC RPC FUNCTIONS
-- Dumb Charades — Bollywood Edition
--
-- All game operations are atomic stored procedures (SECURITY DEFINER).
-- React calls these via supabase.rpc(). They never make partial updates.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- HELPER: save checkpoint
-- Called at the end of every state-changing function.
-- ---------------------------------------------------------------------------
create or replace function _save_round_checkpoint(
  p_round_id   uuid,
  p_phase      text    default null,
  p_extra      jsonb   default '{}'::jsonb
)
returns void language plpgsql as $$
declare
  v_round      rounds%rowtype;
  v_scores     jsonb;
  v_stats      jsonb;
  v_state      jsonb;
  v_timer_st   text;
begin
  select * into v_round from rounds where id = p_round_id for update;
  if not found then
    raise exception 'Round % not found', p_round_id;
  end if;

  -- Aggregate scores from turns
  select
    jsonb_object_agg(t.player_id::text, coalesce(sum(t.points), 0))
  into v_scores
  from turns t
  where t.round_id = p_round_id
    and t.status in ('completed', 'timeout');

  if v_scores is null then v_scores := '{}'::jsonb; end if;

  -- Statistics
  select jsonb_build_object(
    'moviesGuessed', count(*) filter (where t.result = 'correct'),
    'passes',        count(*) filter (where t.result = 'pass'),
    'timeouts',      count(*) filter (where t.result = 'timeout'),
    'totalTurns',    count(*),
    'totalTurnTime', coalesce(sum(t.duration_seconds) filter (where t.duration_seconds is not null), 0)
  )
  into v_stats
  from turns t
  where t.round_id = p_round_id
    and t.status in ('completed', 'timeout');

  -- Determine timer state label
  v_timer_st := case v_round.timer_state
    when 'running' then 'running'
    when 'paused'  then 'paused'
    when 'expired' then 'expired'
    else 'idle'
  end;

  -- Build full state JSONB
  v_state := jsonb_build_object(
    'phase',               coalesce(p_phase, 'turn_' || v_round.status),
    'currentPlayerIndex',  v_round.current_player_index,
    'currentTurnNumber',   v_round.current_turn_number,
    'movie', jsonb_build_object(
      'id',       v_round.current_movie_id,
      'revealed', v_round.movie_revealed
    ),
    'timer', jsonb_build_object(
      'duration',  v_round.timer_duration_seconds,
      'remaining', v_round.timer_remaining_seconds,
      'status',    v_timer_st,
      'startedAt', v_round.timer_started_at,
      'pausedAt',  v_round.timer_paused_at
    ),
    'scores',     v_scores,
    'statistics', v_stats
  ) || p_extra;

  update rounds set
    round_state   = v_state,
    last_saved_at = now(),
    updated_at    = now()
  where id = p_round_id;
end;
$$;


-- ---------------------------------------------------------------------------
-- RPC: create_player
-- ---------------------------------------------------------------------------
create or replace function create_player(
  p_name         text,
  p_avatar_color text default '#007cf0'
)
returns uuid language plpgsql security definer as $$
declare
  v_id uuid;
begin
  if trim(p_name) = '' then
    raise exception 'Player name cannot be empty';
  end if;

  insert into players (name, avatar_color)
  values (trim(p_name), p_avatar_color)
  returning id into v_id;

  return v_id;
end;
$$;


-- ---------------------------------------------------------------------------
-- RPC: create_game
-- Creates a new game with settings and returns its id.
-- ---------------------------------------------------------------------------
create or replace function create_game(
  p_settings jsonb default '{
    "turn_duration": 60,
    "era": "all",
    "difficulty": "all"
  }'::jsonb
)
returns uuid language plpgsql security definer as $$
declare
  v_id uuid;
begin
  insert into games (settings)
  values (p_settings)
  returning id into v_id;

  return v_id;
end;
$$;


-- ---------------------------------------------------------------------------
-- RPC: add_player_to_game
-- ---------------------------------------------------------------------------
create or replace function add_player_to_game(
  p_game_id   uuid,
  p_player_id uuid,
  p_order     integer default null
)
returns uuid language plpgsql security definer as $$
declare
  v_id    uuid;
  v_order integer;
begin
  -- Auto-assign order if not provided
  if p_order is null then
    select coalesce(max(player_order) + 1, 0)
    into v_order
    from game_players
    where game_id = p_game_id;
  else
    v_order := p_order;
  end if;

  insert into game_players (game_id, player_id, player_order)
  values (p_game_id, p_player_id, v_order)
  on conflict (game_id, player_id) do nothing
  returning id into v_id;

  return v_id;
end;
$$;


-- ---------------------------------------------------------------------------
-- RPC: start_round
-- Creates a new round, sets it as the game's current round.
-- Player order is determined from game_players.
-- ---------------------------------------------------------------------------
create or replace function start_round(p_game_id uuid)
returns uuid language plpgsql security definer as $$
declare
  v_round_id      uuid;
  v_round_number  integer;
  v_first_player  uuid;
  v_duration      integer;
begin
  -- Validate game exists
  if not exists (select 1 from games where id = p_game_id) then
    raise exception 'Game % not found', p_game_id;
  end if;

  -- Require at least 2 players
  if (select count(*) from game_players where game_id = p_game_id) < 2 then
    raise exception 'At least 2 players required to start a round';
  end if;

  -- Next round number
  select coalesce(max(round_number) + 1, 1)
  into v_round_number
  from rounds
  where game_id = p_game_id;

  -- First player in order
  select player_id into v_first_player
  from game_players
  where game_id = p_game_id
  order by player_order asc
  limit 1;

  -- Turn duration from settings
  select coalesce((settings->>'turn_duration')::integer, 60)
  into v_duration
  from games
  where id = p_game_id;

  -- Create round
  insert into rounds (
    game_id,
    round_number,
    status,
    current_player_id,
    current_player_index,
    current_turn_number,
    timer_duration_seconds,
    timer_remaining_seconds,
    timer_state,
    started_at
  )
  values (
    p_game_id,
    v_round_number,
    'active',
    v_first_player,
    0,
    1,
    v_duration,
    v_duration,
    'idle',
    now()
  )
  returning id into v_round_id;

  -- Point game at this round and mark active
  update games set
    current_round_id = v_round_id,
    status           = 'active',
    updated_at       = now()
  where id = p_game_id;

  -- Save initial checkpoint
  perform _save_round_checkpoint(v_round_id, 'round_started');

  return v_round_id;
end;
$$;


-- ---------------------------------------------------------------------------
-- RPC: start_turn
-- Records the beginning of a turn (movie selected, player assigned).
-- Idempotent: if a pending turn for this round/turn_number exists, reuse it.
-- ---------------------------------------------------------------------------
create or replace function start_turn(
  p_round_id   uuid,
  p_player_id  uuid,
  p_movie_id   uuid
)
returns uuid language plpgsql security definer as $$
declare
  v_turn_id     uuid;
  v_turn_num    integer;
  v_game_id     uuid;
  v_duration    integer;
begin
  -- Lock round row
  select game_id, current_turn_number, timer_duration_seconds
  into v_game_id, v_turn_num, v_duration
  from rounds
  where id = p_round_id
  for update;

  if not found then
    raise exception 'Round % not found', p_round_id;
  end if;

  -- Check for existing active/pending turn (idempotency)
  select id into v_turn_id
  from turns
  where round_id = p_round_id
    and turn_number = v_turn_num
    and status in ('pending', 'active')
  limit 1;

  if v_turn_id is null then
    -- Create turn record
    insert into turns (
      round_id, player_id, movie_id, turn_number,
      status, started_at
    )
    values (
      p_round_id, p_player_id, p_movie_id, v_turn_num,
      'active', now()
    )
    returning id into v_turn_id;
  end if;

  -- Update round pointer
  update rounds set
    current_player_id       = p_player_id,
    current_movie_id        = p_movie_id,
    current_turn_id         = v_turn_id,
    movie_revealed          = false,
    timer_state             = 'idle',
    timer_started_at        = null,
    timer_paused_at         = null,
    timer_remaining_seconds = v_duration,
    turn_started_at         = now(),
    turn_revealed_at        = null
  where id = p_round_id;

  -- Record movie usage (ignore conflict — same movie can't be used twice per game)
  insert into round_movie_usage (game_id, round_id, movie_id, turn_id)
  values (v_game_id, p_round_id, p_movie_id, v_turn_id)
  on conflict (game_id, movie_id) do nothing;

  -- Update turn with the turn_id reference
  update turns set updated_at = now() where id = v_turn_id;

  perform _save_round_checkpoint(p_round_id, 'turn_started');

  return v_turn_id;
end;
$$;


-- ---------------------------------------------------------------------------
-- RPC: reveal_movie
-- Actor taps "Reveal Film". Starts the timer with a server timestamp.
-- ---------------------------------------------------------------------------
create or replace function reveal_movie(p_round_id uuid)
returns void language plpgsql security definer as $$
declare
  v_duration integer;
  v_remaining integer;
begin
  select timer_duration_seconds, timer_remaining_seconds
  into v_duration, v_remaining
  from rounds
  where id = p_round_id
  for update;

  if not found then
    raise exception 'Round % not found', p_round_id;
  end if;

  -- Use stored remaining or full duration
  if v_remaining is null or v_remaining <= 0 then
    v_remaining := v_duration;
  end if;

  update rounds set
    movie_revealed          = true,
    timer_state             = 'running',
    timer_started_at        = now(),
    timer_paused_at         = null,
    timer_remaining_seconds = v_remaining,
    turn_revealed_at        = now()
  where id = p_round_id;

  -- Update active turn revealed_at
  update turns set
    revealed_at = now(),
    updated_at  = now()
  where id = (select current_turn_id from rounds where id = p_round_id)
    and revealed_at is null;

  perform _save_round_checkpoint(p_round_id, 'movie_revealed');
end;
$$;


-- ---------------------------------------------------------------------------
-- RPC: pause_turn
-- Calculates exact remaining time from server timestamp and stores it.
-- ---------------------------------------------------------------------------
create or replace function pause_turn(p_round_id uuid)
returns integer language plpgsql security definer as $$
declare
  v_round         rounds%rowtype;
  v_remaining     integer;
  v_elapsed       numeric;
begin
  select * into v_round
  from rounds
  where id = p_round_id
  for update;

  if not found then
    raise exception 'Round % not found', p_round_id;
  end if;

  -- Already paused — idempotent
  if v_round.timer_state = 'paused' then
    return v_round.timer_remaining_seconds;
  end if;

  if v_round.timer_state = 'running' and v_round.timer_started_at is not null then
    v_elapsed := extract(epoch from (now() - v_round.timer_started_at));
    v_remaining := greatest(0, v_round.timer_remaining_seconds - v_elapsed::integer);
  else
    v_remaining := coalesce(v_round.timer_remaining_seconds, v_round.timer_duration_seconds);
  end if;

  update rounds set
    timer_state             = 'paused',
    timer_paused_at         = now(),
    timer_remaining_seconds = v_remaining
  where id = p_round_id;

  -- Pause the active turn
  update turns set
    paused_at  = now(),
    updated_at = now()
  where id = v_round.current_turn_id
    and paused_at is null;

  perform _save_round_checkpoint(p_round_id, 'turn_paused');

  return v_remaining;
end;
$$;


-- ---------------------------------------------------------------------------
-- RPC: resume_turn
-- Restarts the timer from the stored remaining value using a fresh server timestamp.
-- ---------------------------------------------------------------------------
create or replace function resume_turn(p_round_id uuid)
returns void language plpgsql security definer as $$
declare
  v_round rounds%rowtype;
begin
  select * into v_round
  from rounds
  where id = p_round_id
  for update;

  if not found then
    raise exception 'Round % not found', p_round_id;
  end if;

  -- Already running — idempotent
  if v_round.timer_state = 'running' then
    return;
  end if;

  -- timer_remaining_seconds already holds the correct value from pause_turn
  update rounds set
    timer_state      = 'running',
    timer_started_at = now(),   -- fresh server timestamp: remaining - (now - started_at) is the formula
    timer_paused_at  = null
  where id = p_round_id;

  perform _save_round_checkpoint(p_round_id, 'turn_resumed');
end;
$$;


-- ---------------------------------------------------------------------------
-- RPC: complete_turn
-- Records result. Idempotency guard: cannot complete an already-completed turn.
-- Advances the round to the next player.
-- ---------------------------------------------------------------------------
create or replace function complete_turn(
  p_round_id  uuid,
  p_result    turn_result  -- 'correct' | 'pass' | 'timeout'
)
returns jsonb language plpgsql security definer as $$
declare
  v_round          rounds%rowtype;
  v_turn           turns%rowtype;
  v_points         integer;
  v_elapsed        numeric;
  v_actual_time    integer;
  v_player_count   integer;
  v_next_index     integer;
  v_next_player_id uuid;
  v_next_turn_num  integer;
begin
  -- Lock round
  select * into v_round from rounds where id = p_round_id for update;
  if not found then raise exception 'Round % not found', p_round_id; end if;

  -- Lock current turn
  select * into v_turn from turns where id = v_round.current_turn_id for update;
  if not found then raise exception 'No active turn for round %', p_round_id; end if;

  -- IDEMPOTENCY GUARD — turn already completed
  if v_turn.status in ('completed', 'timeout', 'cancelled') then
    raise exception 'Turn % already completed (status: %)', v_turn.id, v_turn.status
      using errcode = 'P0002';
  end if;

  -- Calculate points
  v_points := case when p_result = 'correct' then 10 else 0 end;

  -- Actual time taken
  if v_round.timer_started_at is not null then
    v_elapsed := extract(epoch from (now() - v_round.timer_started_at));
    v_actual_time := least(
      v_round.timer_duration_seconds,
      (v_round.timer_duration_seconds - v_round.timer_remaining_seconds) + v_elapsed::integer
    );
  else
    v_actual_time := v_round.timer_duration_seconds;
  end if;

  -- Complete the turn
  update turns set
    status           = case when p_result = 'timeout' then 'timeout'::turn_status else 'completed'::turn_status end,
    result           = p_result,
    points           = v_points,
    duration_seconds = v_actual_time,
    completed_at     = now(),
    updated_at       = now()
  where id = v_turn.id;

  -- Advance to next player
  select count(*) into v_player_count
  from game_players
  where game_id = v_round.game_id;

  v_next_index := (v_round.current_player_index + 1) % v_player_count;
  v_next_turn_num := v_round.current_turn_number + 1;

  select player_id into v_next_player_id
  from game_players
  where game_id = v_round.game_id
    and player_order = v_next_index;

  -- Reset round for next turn (movie not yet selected)
  update rounds set
    current_player_id       = v_next_player_id,
    current_player_index    = v_next_index,
    current_turn_number     = v_next_turn_num,
    current_movie_id        = null,
    current_turn_id         = null,
    movie_revealed          = false,
    timer_state             = 'idle',
    timer_started_at        = null,
    timer_paused_at         = null,
    timer_remaining_seconds = v_round.timer_duration_seconds,
    turn_started_at         = null,
    turn_revealed_at        = null
  where id = p_round_id;

  perform _save_round_checkpoint(p_round_id, 'turn_completed');

  return jsonb_build_object(
    'result',           p_result,
    'points',           v_points,
    'nextPlayerIndex',  v_next_index,
    'nextTurnNumber',   v_next_turn_num
  );
end;
$$;


-- ---------------------------------------------------------------------------
-- RPC: complete_round
-- Marks round completed, preserves all state.
-- ---------------------------------------------------------------------------
create or replace function complete_round(p_round_id uuid)
returns void language plpgsql security definer as $$
begin
  -- Cancel any active/pending turn
  update turns set
    status       = 'cancelled',
    completed_at = now(),
    updated_at   = now()
  where round_id = p_round_id
    and status in ('pending', 'active');

  update rounds set
    status       = 'completed',
    completed_at = now(),
    timer_state  = 'idle'
  where id = p_round_id;

  perform _save_round_checkpoint(p_round_id, 'round_completed');
end;
$$;


-- ---------------------------------------------------------------------------
-- RPC: resume_round
-- Reopens a completed or paused round from its last checkpoint.
-- Historical turns are NOT deleted. Points are NOT duplicated.
-- ---------------------------------------------------------------------------
create or replace function resume_round(p_round_id uuid)
returns jsonb language plpgsql security definer as $$
declare
  v_round rounds%rowtype;
begin
  select * into v_round
  from rounds
  where id = p_round_id
  for update;

  if not found then
    raise exception 'Round % not found', p_round_id;
  end if;

  -- Re-activate
  update rounds set
    status          = 'active',
    completed_at    = null,   -- no longer "done"
    timer_state     = 'paused', -- safe default: user must explicitly resume timer
    timer_started_at = null
  where id = p_round_id;

  -- Point game to this round
  update games set
    current_round_id = p_round_id,
    status           = 'active',
    updated_at       = now()
  where id = v_round.game_id;

  perform _save_round_checkpoint(p_round_id, 'round_reopened');

  return get_round_resume_state(p_round_id);
end;
$$;


-- ---------------------------------------------------------------------------
-- RPC: get_round_resume_state
-- Returns everything the frontend needs to reconstruct a round after refresh.
-- Includes computed remaining timer value.
-- ---------------------------------------------------------------------------
create or replace function get_round_resume_state(p_round_id uuid)
returns jsonb language plpgsql security definer as $$
declare
  v_round          rounds%rowtype;
  v_turn           turns%rowtype;
  v_computed_rem   integer;
  v_elapsed        numeric;
  v_timer_expired  boolean := false;
  v_scores         jsonb;
  v_players        jsonb;
begin
  select * into v_round from rounds where id = p_round_id;
  if not found then raise exception 'Round % not found', p_round_id; end if;

  -- Compute real-time remaining seconds
  if v_round.timer_state = 'running' and v_round.timer_started_at is not null then
    v_elapsed := extract(epoch from (now() - v_round.timer_started_at));
    v_computed_rem := greatest(0, v_round.timer_remaining_seconds - v_elapsed::integer);
    if v_computed_rem <= 0 then v_timer_expired := true; end if;
  else
    v_computed_rem := coalesce(v_round.timer_remaining_seconds, v_round.timer_duration_seconds);
  end if;

  -- Active turn if any
  if v_round.current_turn_id is not null then
    select * into v_turn from turns where id = v_round.current_turn_id;
  end if;

  -- Per-player scores from turns
  select coalesce(
    jsonb_object_agg(t.player_id::text, coalesce(sum(t.points), 0)),
    '{}'::jsonb
  )
  into v_scores
  from turns t
  where t.round_id = p_round_id
    and t.status in ('completed', 'timeout');

  -- Game players ordered
  select jsonb_agg(
    jsonb_build_object(
      'id',           p.id,
      'name',         p.name,
      'avatarColor',  p.avatar_color,
      'order',        gp.player_order
    ) order by gp.player_order
  )
  into v_players
  from game_players gp
  join players p on p.id = gp.player_id
  where gp.game_id = v_round.game_id;

  return jsonb_build_object(
    'round', jsonb_build_object(
      'id',               v_round.id,
      'gameId',           v_round.game_id,
      'roundNumber',      v_round.round_number,
      'status',           v_round.status,
      'currentPlayerIndex', v_round.current_player_index,
      'currentTurnNumber',  v_round.current_turn_number,
      'movieRevealed',    v_round.movie_revealed,
      'lastSavedAt',      v_round.last_saved_at
    ),
    'currentPlayer', jsonb_build_object(
      'id',    v_round.current_player_id,
      'index', v_round.current_player_index
    ),
    'currentMovie', case
      when v_round.current_movie_id is not null then
        (select jsonb_build_object(
          'id', m.id, 'title', m.title, 'year', m.year,
          'era', m.era, 'difficulty', m.difficulty
        ) from movies m where m.id = v_round.current_movie_id)
      else null
    end,
    'currentTurn', case
      when v_turn.id is not null then
        jsonb_build_object(
          'id',          v_turn.id,
          'status',      v_turn.status,
          'result',      v_turn.result,
          'startedAt',   v_turn.started_at,
          'revealedAt',  v_turn.revealed_at
        )
      else null
    end,
    'timer', jsonb_build_object(
      'durationSeconds',   v_round.timer_duration_seconds,
      'remainingSeconds',  v_computed_rem,
      'state',             case when v_timer_expired then 'expired' else v_round.timer_state::text end,
      'startedAt',         v_round.timer_started_at,
      'pausedAt',          v_round.timer_paused_at,
      'isExpired',         v_timer_expired
    ),
    'scores',  v_scores,
    'players', v_players,
    'roundState', v_round.round_state
  );
end;
$$;


-- ---------------------------------------------------------------------------
-- RPC: get_available_movie
-- Returns a random movie not yet used in this game, respecting filters.
-- Falls back to all filtered movies if pool exhausted.
-- ---------------------------------------------------------------------------
create or replace function get_available_movie(
  p_game_id    uuid,
  p_era        text    default 'all',
  p_difficulty text    default 'all'
)
returns jsonb language plpgsql security definer as $$
declare
  v_movie_id uuid;
  v_result   jsonb;
begin
  -- Try unplayed movies first
  select m.id into v_movie_id
  from movies m
  where
    (p_era = 'all'        or m.era::text = p_era)
    and (p_difficulty = 'all' or m.difficulty::text = p_difficulty)
    and m.id not in (
      select movie_id from round_movie_usage where game_id = p_game_id
    )
  order by random()
  limit 1;

  -- Fallback: reset pool and pick from all filtered movies
  if v_movie_id is null then
    delete from round_movie_usage where game_id = p_game_id;

    select m.id into v_movie_id
    from movies m
    where
      (p_era = 'all'        or m.era::text = p_era)
      and (p_difficulty = 'all' or m.difficulty::text = p_difficulty)
    order by random()
    limit 1;
  end if;

  if v_movie_id is null then
    raise exception 'No movies match filters era=% difficulty=%', p_era, p_difficulty;
  end if;

  select jsonb_build_object(
    'id', m.id, 'title', m.title, 'year', m.year,
    'era', m.era, 'difficulty', m.difficulty
  )
  into v_result
  from movies m
  where m.id = v_movie_id;

  return v_result;
end;
$$;
