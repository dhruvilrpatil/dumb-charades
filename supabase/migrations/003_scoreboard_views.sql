-- =============================================================================
-- MIGRATION 003: SCOREBOARD VIEWS
-- Dumb Charades — Bollywood Edition
--
-- Three views that derive all scores from the turns table.
-- Never stores duplicated totals — always computed from source records.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- VIEW: round_scoreboard
-- Per-player scores within a single round.
-- Usage: SELECT * FROM round_scoreboard WHERE round_id = '...'
-- ---------------------------------------------------------------------------
create or replace view round_scoreboard as
select
  r.id                                        as round_id,
  r.game_id,
  p.id                                        as player_id,
  p.name                                      as player_name,
  p.avatar_color,
  gp.player_order,

  coalesce(sum(t.points), 0)::integer         as score,
  count(t.id) filter (where t.result = 'correct')::integer  as movies_guessed,
  count(t.id) filter (where t.result = 'pass')::integer     as passes,
  count(t.id) filter (where t.result = 'timeout')::integer  as timeouts,

  round(
    avg(t.duration_seconds) filter (where t.duration_seconds is not null),
    1
  )                                           as average_time_seconds,

  -- Rank within round (dense_rank so ties share position)
  dense_rank() over (
    partition by r.id
    order by coalesce(sum(t.points), 0) desc
  )                                           as rank

from rounds r
join game_players gp on gp.game_id = r.game_id
join players p       on p.id = gp.player_id
left join turns t    on t.round_id = r.id
                     and t.player_id = p.id
                     and t.status in ('completed', 'timeout')
group by r.id, r.game_id, p.id, p.name, p.avatar_color, gp.player_order;

comment on view round_scoreboard is
  'Per-round leaderboard. Scores always derived from turns table — never double-counted.';


-- ---------------------------------------------------------------------------
-- VIEW: all_time_scoreboard
-- Per-player aggregates across all rounds in a game.
-- Usage: SELECT * FROM all_time_scoreboard WHERE game_id = '...'
-- ---------------------------------------------------------------------------
create or replace view all_time_scoreboard as
select
  g.id                                        as game_id,
  p.id                                        as player_id,
  p.name                                      as player_name,
  p.avatar_color,

  coalesce(sum(t.points), 0)::integer         as total_points,

  -- Count distinct rounds where the player had at least one completed turn
  count(distinct t.round_id)::integer         as rounds_played,

  count(t.id) filter (where t.result = 'correct')::integer  as movies_guessed,
  count(t.id) filter (where t.result = 'pass')::integer     as passes,
  count(t.id) filter (where t.result = 'timeout')::integer  as timeouts,

  round(
    avg(t.duration_seconds) filter (where t.duration_seconds is not null),
    1
  )                                           as average_time_seconds,

  dense_rank() over (
    partition by g.id
    order by coalesce(sum(t.points), 0) desc
  )                                           as rank

from games g
join game_players gp on gp.game_id = g.id
join players p       on p.id = gp.player_id
left join turns t    on t.player_id = p.id
                     and t.status in ('completed', 'timeout')
                     -- Only count turns from rounds belonging to this game
                     and exists (
                       select 1 from rounds r
                       where r.id = t.round_id
                         and r.game_id = g.id
                     )
group by g.id, p.id, p.name, p.avatar_color;

comment on view all_time_scoreboard is
  'All-time tournament leaderboard aggregated per game. Reopening a round never duplicates turns because each turn row has a unique ID — SUM just re-aggregates the same rows.';


-- ---------------------------------------------------------------------------
-- VIEW: round_history
-- One row per round. Powers the Resume Screen.
-- Usage: SELECT * FROM round_history WHERE game_id = '...' ORDER BY round_number
-- ---------------------------------------------------------------------------
create or replace view round_history as
select
  r.id                                  as round_id,
  r.game_id,
  r.round_number,
  r.status,
  r.started_at,
  r.completed_at,
  r.last_saved_at,

  -- Current turn info
  r.current_player_id,
  cp.name                               as current_player_name,
  r.current_turn_number,
  r.current_movie_id,
  cm.title                              as current_movie_title,
  r.movie_revealed,

  -- Timer reconstruction data
  r.timer_state,
  r.timer_remaining_seconds,
  r.timer_started_at,
  r.timer_paused_at,
  r.timer_duration_seconds,

  -- Compute current remaining if timer is running
  case
    when r.timer_state = 'running' and r.timer_started_at is not null then
      greatest(0,
        r.timer_remaining_seconds -
        extract(epoch from (now() - r.timer_started_at))::integer
      )
    else
      coalesce(r.timer_remaining_seconds, r.timer_duration_seconds)
  end                                   as computed_remaining_seconds,

  -- Winner of this round (highest scorer, first by order on tie)
  (
    select p2.name
    from round_scoreboard rs2
    join players p2 on p2.id = rs2.player_id
    where rs2.round_id = r.id
      and rs2.rank = 1
    order by rs2.player_order asc
    limit 1
  )                                     as round_winner_name,

  -- Total points scored in round
  (
    select coalesce(sum(t2.points), 0)::integer
    from turns t2
    where t2.round_id = r.id
      and t2.status in ('completed', 'timeout')
  )                                     as total_round_points,

  -- Turn counts
  (select count(*) filter (where t3.result = 'correct')
   from turns t3 where t3.round_id = r.id)::integer  as correct_count,
  (select count(*) filter (where t3.result = 'pass')
   from turns t3 where t3.round_id = r.id)::integer  as pass_count,
  (select count(*) filter (where t3.result = 'timeout')
   from turns t3 where t3.round_id = r.id)::integer  as timeout_count,

  -- Is this the game's currently active round?
  (r.id = g.current_round_id)           as is_current

from rounds r
join games g on g.id = r.game_id
left join players cp on cp.id = r.current_player_id
left join movies  cm on cm.id = r.current_movie_id;

comment on view round_history is
  'Complete round history with resume data. Used by the Round History / Resume Screen in the frontend.';
