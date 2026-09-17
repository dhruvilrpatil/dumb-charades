-- =============================================================================
-- MIGRATION 001: INITIAL SCHEMA
-- Dumb Charades — Bollywood Edition
--
-- Creates all core tables, constraints, indexes.
-- Run on a fresh Supabase project before any other migration.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "pg_trgm";    -- future title search


-- ---------------------------------------------------------------------------
-- ENUM TYPES
-- ---------------------------------------------------------------------------
create type game_status   as enum ('lobby', 'active', 'paused', 'completed');
create type round_status  as enum ('not_started', 'active', 'paused', 'completed');
create type turn_status   as enum ('pending', 'active', 'completed', 'timeout', 'cancelled');
create type turn_result   as enum ('correct', 'pass', 'timeout');
create type movie_era     as enum ('80s', '90s', '2000s');
create type movie_diff    as enum ('easy', 'medium', 'hard', 'bizarre');
create type timer_state   as enum ('idle', 'running', 'paused', 'expired');


-- ---------------------------------------------------------------------------
-- PLAYERS
-- Persistent global players, independent of any game.
-- ---------------------------------------------------------------------------
create table players (
  id            uuid          primary key default gen_random_uuid(),
  name          text          not null,
  avatar_color  text          not null default '#007cf0',
  created_at    timestamptz   not null default now(),
  updated_at    timestamptz   not null default now(),

  constraint players_name_nonempty check (trim(name) <> '')
);

comment on table players is
  'Global player registry. Players persist across games and are never deleted.';

create index idx_players_name on players (lower(trim(name)));


-- ---------------------------------------------------------------------------
-- MOVIES
-- Static catalog — seeded once, never updated by gameplay.
-- ---------------------------------------------------------------------------
create table movies (
  id            uuid          primary key default gen_random_uuid(),
  title         text          not null unique,
  year          integer       not null check (year >= 1900 and year <= 2030),
  era           movie_era     not null,
  difficulty    movie_diff    not null,
  created_at    timestamptz   not null default now()
);

comment on table movies is
  'Bollywood film catalog. era and difficulty drive filtering.';

create index idx_movies_era        on movies (era);
create index idx_movies_difficulty on movies (difficulty);
create index idx_movies_era_diff   on movies (era, difficulty);


-- ---------------------------------------------------------------------------
-- GAMES
-- A tournament session. Contains many rounds.
-- ---------------------------------------------------------------------------
create table games (
  id                uuid          primary key default gen_random_uuid(),
  status            game_status   not null default 'lobby',
  current_round_id  uuid,                      -- FK added after rounds table

  -- Settings JSONB: { turn_duration: 60|90|120, era: 'all'|'80s'|'90s'|'2000s',
  --                   difficulty: 'all'|'easy'|'medium'|'hard'|'bizarre' }
  settings          jsonb         not null default '{
    "turn_duration": 60,
    "era": "all",
    "difficulty": "all"
  }'::jsonb,

  created_at        timestamptz   not null default now(),
  updated_at        timestamptz   not null default now(),

  constraint games_settings_turn_duration check (
    (settings->>'turn_duration')::integer in (60, 90, 120)
  ),
  constraint games_settings_era check (
    settings->>'era' in ('all', '80s', '90s', '2000s')
  ),
  constraint games_settings_difficulty check (
    settings->>'difficulty' in ('all', 'easy', 'medium', 'hard', 'bizarre')
  )
);

comment on table games is
  'Top-level tournament session. Contains settings and points to the active round.';


-- ---------------------------------------------------------------------------
-- GAME PLAYERS
-- Associates players with a game in a specific order.
-- ---------------------------------------------------------------------------
create table game_players (
  id            uuid          primary key default gen_random_uuid(),
  game_id       uuid          not null references games (id) on delete cascade,
  player_id     uuid          not null references players (id) on delete restrict,
  player_order  integer       not null check (player_order >= 0),
  joined_at     timestamptz   not null default now(),

  constraint game_players_unique_player unique (game_id, player_id),
  constraint game_players_unique_order  unique (game_id, player_order)
);

comment on table game_players is
  'Maps players to a game with a stable turn-order index. Deleting a game cascades here but never deletes the global player.';

create index idx_game_players_game   on game_players (game_id);
create index idx_game_players_player on game_players (player_id);


-- ---------------------------------------------------------------------------
-- ROUNDS
-- The core persistence unit. Every checkpoint writes here.
-- ---------------------------------------------------------------------------
create table rounds (
  id                        uuid          primary key default gen_random_uuid(),
  game_id                   uuid          not null references games (id) on delete cascade,
  round_number              integer       not null check (round_number >= 1),
  status                    round_status  not null default 'not_started',

  -- Current turn pointers
  current_player_id         uuid          references players (id) on delete set null,
  current_player_index      integer       not null default 0 check (current_player_index >= 0),
  current_turn_number       integer       not null default 0 check (current_turn_number >= 0),
  current_movie_id          uuid          references movies (id) on delete set null,
  current_turn_id           uuid,         -- FK added after turns table

  -- Movie reveal state
  movie_revealed            boolean       not null default false,

  -- Timer columns (the source of truth for reconstruction)
  timer_duration_seconds    integer       not null default 60 check (timer_duration_seconds > 0),
  timer_remaining_seconds   integer       check (timer_remaining_seconds >= 0),
  timer_state               timer_state   not null default 'idle',
  timer_started_at          timestamptz,  -- server timestamp when timer last started/resumed
  timer_paused_at           timestamptz,  -- server timestamp when timer was paused

  -- Turn timestamps
  turn_started_at           timestamptz,
  turn_revealed_at          timestamptz,

  -- Checkpoint
  last_saved_at             timestamptz   not null default now(),

  -- Full UI/game state snapshot — flexible JSONB checkpoint
  round_state               jsonb         not null default '{}'::jsonb,

  -- Lifecycle
  started_at                timestamptz,
  completed_at              timestamptz,
  created_at                timestamptz   not null default now(),
  updated_at                timestamptz   not null default now(),

  constraint rounds_unique_number unique (game_id, round_number)
);

comment on table rounds is
  'Resumable round session. Every meaningful game event writes a checkpoint here.
  timer_started_at + timer_remaining_seconds allow exact timer reconstruction on resume.';

create index idx_rounds_game_id      on rounds (game_id);
create index idx_rounds_status       on rounds (status);
create index idx_rounds_last_saved   on rounds (last_saved_at desc);
create index idx_rounds_game_status  on rounds (game_id, status);


-- ---------------------------------------------------------------------------
-- TURNS
-- Historical record of every turn. Never deleted.
-- ---------------------------------------------------------------------------
create table turns (
  id                  uuid          primary key default gen_random_uuid(),
  round_id            uuid          not null references rounds (id) on delete cascade,
  player_id           uuid          not null references players (id) on delete restrict,
  movie_id            uuid          not null references movies (id) on delete restrict,
  turn_number         integer       not null check (turn_number >= 1),

  status              turn_status   not null default 'pending',
  result              turn_result,                              -- null until completed
  points              integer       not null default 0 check (points >= 0),

  duration_seconds    integer       check (duration_seconds >= 0),  -- actual time taken

  started_at          timestamptz,
  revealed_at         timestamptz,
  paused_at           timestamptz,
  completed_at        timestamptz,

  created_at          timestamptz   not null default now(),
  updated_at          timestamptz   not null default now(),

  -- Prevent double-completion at the DB level
  constraint turns_completed_result check (
    (status in ('completed', 'timeout')) = (result is not null)
  ),
  constraint turns_unique_number unique (round_id, turn_number)
);

comment on table turns is
  'Immutable turn history. A turn can only be completed once (enforced by status + DB constraint). Points are derived here; scoreboards aggregate from this table.';

create index idx_turns_round_id   on turns (round_id);
create index idx_turns_player_id  on turns (player_id);
create index idx_turns_movie_id   on turns (movie_id);
create index idx_turns_status     on turns (status);


-- ---------------------------------------------------------------------------
-- ROUND MOVIE USAGE
-- Tracks which movies have been used within a game to prevent repeats.
-- Separate from turns for O(1) filtering queries.
-- ---------------------------------------------------------------------------
create table round_movie_usage (
  id          uuid          primary key default gen_random_uuid(),
  game_id     uuid          not null references games (id) on delete cascade,
  round_id    uuid          not null references rounds (id) on delete cascade,
  movie_id    uuid          not null references movies (id) on delete cascade,
  turn_id     uuid          references turns (id) on delete set null,
  used_at     timestamptz   not null default now(),

  -- A movie can only be used once per game
  constraint round_movie_usage_unique unique (game_id, movie_id)
);

comment on table round_movie_usage is
  'Fast lookup table for movies already used within a game. Unique per game, not per round — movies never repeat across the whole tournament.';

create index idx_rmu_game_id   on round_movie_usage (game_id);
create index idx_rmu_round_id  on round_movie_usage (round_id);
create index idx_rmu_movie_id  on round_movie_usage (movie_id);


-- ---------------------------------------------------------------------------
-- DEFERRED FOREIGN KEYS (added after both tables exist)
-- ---------------------------------------------------------------------------
alter table games  add constraint fk_games_current_round
  foreign key (current_round_id) references rounds (id) on delete set null
  deferrable initially deferred;

alter table rounds add constraint fk_rounds_current_turn
  foreign key (current_turn_id) references turns (id) on delete set null
  deferrable initially deferred;


-- ---------------------------------------------------------------------------
-- UPDATED_AT TRIGGER
-- Automatically maintains updated_at on all tables.
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_players_updated_at
  before update on players
  for each row execute function set_updated_at();

create trigger trg_games_updated_at
  before update on games
  for each row execute function set_updated_at();

create trigger trg_rounds_updated_at
  before update on rounds
  for each row execute function set_updated_at();

create trigger trg_turns_updated_at
  before update on turns
  for each row execute function set_updated_at();
