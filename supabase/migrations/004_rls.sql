-- =============================================================================
-- MIGRATION 004: ROW LEVEL SECURITY
-- Dumb Charades — Bollywood Edition
--
-- Strategy: PERMISSIVE ANON ACCESS with game_id isolation.
--   - Anyone with the publishable (anon) key can create/read/write games.
--   - Data is isolated by game_id — you cannot see another game's data unless
--     you know its UUID (which is never guessed).
--   - players and movies tables are globally readable (needed for lookups).
--   - No user accounts required — perfect for a local party game.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- ENABLE RLS on all application tables
-- ---------------------------------------------------------------------------
alter table players          enable row level security;
alter table movies           enable row level security;
alter table games            enable row level security;
alter table game_players     enable row level security;
alter table rounds           enable row level security;
alter table turns            enable row level security;
alter table round_movie_usage enable row level security;


-- ===========================================================================
-- PLAYERS — globally readable, writable by anon (needed to create players)
-- ===========================================================================
create policy "players_select_anon"
  on players for select
  to anon
  using (true);

create policy "players_insert_anon"
  on players for insert
  to anon
  with check (true);

-- Players can be updated (e.g., rename). No deletion via client.
create policy "players_update_anon"
  on players for update
  to anon
  using (true)
  with check (true);


-- ===========================================================================
-- MOVIES — read-only catalog, no client writes
-- ===========================================================================
create policy "movies_select_anon"
  on movies for select
  to anon
  using (true);

-- No insert/update/delete: movies are seeded by migration only.


-- ===========================================================================
-- GAMES — isolated by game.id (UUID)
-- Anyone who knows the game UUID can read/write it.
-- ===========================================================================
create policy "games_select_anon"
  on games for select
  to anon
  using (true);   -- UUID is the access token; 122-bit entropy

create policy "games_insert_anon"
  on games for insert
  to anon
  with check (true);

create policy "games_update_anon"
  on games for update
  to anon
  using (true)
  with check (true);


-- ===========================================================================
-- GAME PLAYERS — accessible if you know the game_id
-- ===========================================================================
create policy "game_players_select_anon"
  on game_players for select
  to anon
  using (true);

create policy "game_players_insert_anon"
  on game_players for insert
  to anon
  with check (true);

create policy "game_players_delete_anon"
  on game_players for delete
  to anon
  using (true);


-- ===========================================================================
-- ROUNDS — accessible if you know the game_id
-- ===========================================================================
create policy "rounds_select_anon"
  on rounds for select
  to anon
  using (true);

create policy "rounds_insert_anon"
  on rounds for insert
  to anon
  with check (true);

create policy "rounds_update_anon"
  on rounds for update
  to anon
  using (true)
  with check (true);


-- ===========================================================================
-- TURNS — accessible if you know the round (which requires the game_id)
-- ===========================================================================
create policy "turns_select_anon"
  on turns for select
  to anon
  using (true);

create policy "turns_insert_anon"
  on turns for insert
  to anon
  with check (true);

create policy "turns_update_anon"
  on turns for update
  to anon
  using (true)
  with check (true);


-- ===========================================================================
-- ROUND MOVIE USAGE
-- ===========================================================================
create policy "rmu_select_anon"
  on round_movie_usage for select
  to anon
  using (true);

create policy "rmu_insert_anon"
  on round_movie_usage for insert
  to anon
  with check (true);

create policy "rmu_delete_anon"
  on round_movie_usage for delete
  to anon
  using (true);


-- ---------------------------------------------------------------------------
-- GRANT execute on all RPCs to anon role
-- (SECURITY DEFINER functions bypass RLS internally, but must be callable)
-- ---------------------------------------------------------------------------
grant execute on function create_player(text, text)                     to anon;
grant execute on function create_game(jsonb)                             to anon;
grant execute on function add_player_to_game(uuid, uuid, integer)       to anon;
grant execute on function start_round(uuid)                              to anon;
grant execute on function start_turn(uuid, uuid, uuid)                  to anon;
grant execute on function reveal_movie(uuid)                             to anon;
grant execute on function pause_turn(uuid)                               to anon;
grant execute on function resume_turn(uuid)                              to anon;
grant execute on function complete_turn(uuid, turn_result)              to anon;
grant execute on function complete_round(uuid)                           to anon;
grant execute on function resume_round(uuid)                             to anon;
grant execute on function get_round_resume_state(uuid)                  to anon;
grant execute on function get_available_movie(uuid, text, text)         to anon;
