# Database Setup — Dumb Charades Bollywood Edition

Production-ready Supabase PostgreSQL database for persistent gameplay, full round resume, and exact timer reconstruction.

---

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in.
2. Click **New project**.
3. Choose a name (e.g., `damsharas`), strong database password, and nearest region.
4. Wait ~2 minutes for provisioning.
5. Go to **Project Settings → API** and copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon / public key** → `VITE_SUPABASE_PUBLISHABLE_KEY`

> **Never use the `service_role` key in frontend code.** It bypasses RLS and grants full database access.

---

## 2. Environment Variables

Create `.env` at the project root (copy from `.env.example`):

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGci...your_anon_key
```

`.env` is git-ignored. Never commit credentials.

---

## 3. Run Migrations

In the Supabase dashboard go to **SQL Editor** and run each migration in order:

| Order | File | Purpose |
|---|---|---|
| 1 | `supabase/migrations/001_initial_schema.sql` | Tables, types, indexes, triggers |
| 2 | `supabase/migrations/002_round_resume.sql` | Atomic RPC functions |
| 3 | `supabase/migrations/003_scoreboard_views.sql` | Leaderboard views |
| 4 | `supabase/migrations/004_rls.sql` | Row Level Security + RPC grants |
| 5 | `supabase/migrations/005_guesser_points_and_pass_retention.sql` | Guesser (+20) & Actor (+10) points, movie pass retention |
| 6 | `supabase/migrations/006_update_movies_catalog.sql` | 248+ films catalog (Hindi, Marathi, Gujarati) with actors & languages |

Paste each file into the SQL Editor and click **Run**.
*(Note: If you run migration `006_update_movies_catalog.sql`, it automatically updates the schema and seeds all movies in one step).*

Alternatively with the Supabase CLI:

```bash
npx supabase db push --db-url postgresql://postgres:YOUR_PASSWORD@db.YOUR_REF.supabase.co:5432/postgres
```

---

## 4. Seed Movie Data

After migrations, seed the movie catalog:

```sql
-- In the Supabase SQL Editor, paste and run:
-- contents of supabase/seed.sql
```

Or via CLI:

```bash
npx supabase db push --db-url YOUR_CONNECTION_STRING < supabase/seed.sql
```

Verify:

```sql
select era, difficulty, count(*) from movies group by era, difficulty order by era, difficulty;
```

---

## 5. Install Supabase Client

```bash
npm install @supabase/supabase-js
```

---

## 6. Generate TypeScript Types (after connecting project)

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_REF > src/lib/database.types.ts
```

This overwrites the hand-crafted types with auto-generated ones that exactly match the live schema.

---

## 7. Database Architecture

```
games
 └── game_players (player_order, cascade delete)
 └── rounds
      ├── turns (immutable history, never deleted)
      ├── round_movie_usage (per-game usage tracking)
      └── round_state JSONB (full checkpoint snapshot)

players      (global registry, never deleted)
movies       (static catalog, seeded once)

Views:
  round_scoreboard    → per-round leaderboard
  all_time_scoreboard → per-game tournament totals
  round_history       → resume screen with computed timer
```

---

## 8. RLS Policies

**Strategy: Permissive anon with UUID isolation.**

- All tables have RLS enabled.
- The `anon` role can read/write all rows.
- Game data is isolated by `game_id` UUID (128-bit entropy — not guessable).
- `players` and `movies` are globally readable (required for lookups).
- No user accounts required — ideal for a single-device party game.

This is equivalent to "the game UUID is the access token."

---

## 9. Resume / Checkpoint Architecture

Every meaningful game event calls `_save_round_checkpoint()` which:

1. Aggregates scores from `turns` table.
2. Builds a full `round_state` JSONB snapshot.
3. Writes `last_saved_at = now()`.

The explicit timer columns provide precise reconstruction:

| Column | Purpose |
|---|---|
| `timer_duration_seconds` | Full duration of a turn |
| `timer_remaining_seconds` | Seconds stored at last pause/save |
| `timer_started_at` | Server timestamp when timer last started/resumed |
| `timer_paused_at` | Server timestamp when timer was paused |
| `timer_state` | `idle \| running \| paused \| expired` |

---

## 10. Timer Recovery Algorithm

```
On browser restore, call: get_round_resume_state(round_id)

The function computes:
  if timer_state = 'running':
    remaining = timer_remaining_seconds - EXTRACT(EPOCH FROM (NOW() - timer_started_at))
    if remaining <= 0: isExpired = true → call complete_turn(round_id, 'timeout')
    else: start React countdown from 'remaining'

  if timer_state = 'paused':
    remaining = timer_remaining_seconds  (stored at pause time)
    start React countdown from 'remaining', paused

  if timer_state = 'idle':
    remaining = timer_duration_seconds
    timer not started yet
```

**Critical**: `timer_started_at` is reset on every `resume_turn()` call. The formula `remaining - (now - started_at)` always produces the correct value without needing to accumulate pause intervals.

---

## 11. Scoreboard Queries

```sql
-- Round scoreboard
SELECT * FROM round_scoreboard WHERE round_id = 'your-round-uuid' ORDER BY rank;

-- All-time tournament
SELECT * FROM all_time_scoreboard WHERE game_id = 'your-game-uuid' ORDER BY rank;
```

Scores are **always derived from `turns` table**. Reopening a round never double-counts because each turn has a unique `id` — `SUM(points)` over the same rows returns the same value.

---

## 12. Round History Queries

```sql
-- All rounds for a game (for Resume Screen)
SELECT * FROM round_history WHERE game_id = 'your-game-uuid' ORDER BY round_number;

-- Active/paused rounds only
SELECT * FROM round_history
WHERE game_id = 'your-game-uuid'
  AND status IN ('active', 'paused')
ORDER BY round_number;
```

---

## 13. Example Queries

### Create game and players

```typescript
import * as repo from './src/lib/gameRepository'

// Create players
const playerId1 = await repo.createPlayer('Raj', '#007cf0')
const playerId2 = await repo.createPlayer('Simran', '#7928ca')

// Create game
const gameId = await repo.createGame({
  turn_duration: 60,
  era: 'all',
  difficulty: 'all',
})

// Add players
await repo.addPlayerToGame(gameId, playerId1)
await repo.addPlayerToGame(gameId, playerId2)

// Persist game ID (only localStorage usage)
repo.saveGameId(gameId)
```

### Start a round

```typescript
const roundId = await repo.startRound(gameId)
```

### Start a turn

```typescript
const movie = await repo.getAvailableMovie(gameId, 'all', 'all')
const turnId = await repo.startTurn(roundId, playerId1, movie.id)
```

### Reveal the movie (starts timer)

```typescript
await repo.revealMovie(roundId)
// timer_started_at is now a server timestamp
```

### Pause timer

```typescript
const remainingSeconds = await repo.pauseTurn(roundId)
// timer_remaining_seconds stored exactly in DB
```

### Resume timer

```typescript
await repo.resumeTurn(roundId)
// timer_started_at refreshed; formula works correctly
```

### Complete a turn

```typescript
const result = await repo.completeTurn(roundId, 'correct') // or 'pass' | 'timeout'
// result.nextPlayerIndex, result.nextTurnNumber
```

### End round

```typescript
await repo.completeRound(roundId)
```

### Resume a round (browser restore)

```typescript
const state = await repo.getRoundResumeState(roundId)
// state.timer.remainingSeconds — already computed by server
// state.timer.isExpired       — true if time ran out while away
// state.currentMovie, state.currentPlayer, state.scores, etc.
```

### Resume a saved round from history

```typescript
const state = await repo.resumeRound(roundId)
// Sets status = 'active', returns full resume state
```

### View all rounds

```typescript
const history = await repo.getRoundHistory(gameId)
// history[0].status, .round_winner_name, .computed_remaining_seconds, etc.
```

### Scoreboards

```typescript
const roundBoard = await repo.getRoundScoreboard(roundId)
const allTime    = await repo.getAllTimeScoreboard(gameId)
```

---

## 14. Acceptance Test Verification

Run these SQL checks after gameplay to verify correctness:

```sql
-- Test 9: Double-click protection
-- Should return exactly 1 completed turn per round/turn_number
SELECT round_id, turn_number, count(*)
FROM turns
WHERE status IN ('completed', 'timeout')
GROUP BY round_id, turn_number
HAVING count(*) > 1;
-- Expected: 0 rows

-- Test 8: Score integrity — all-time should equal sum of rounds
SELECT
  a.player_id,
  a.total_points,
  sum(rs.score) as sum_of_rounds
FROM all_time_scoreboard a
JOIN round_scoreboard rs ON rs.player_id = a.player_id AND rs.game_id = a.game_id
WHERE a.game_id = 'your-game-uuid'
GROUP BY a.player_id, a.total_points
HAVING a.total_points != sum(rs.score);
-- Expected: 0 rows (all totals match)

-- Verify round checkpoint saved
SELECT id, status, last_saved_at, timer_state, timer_remaining_seconds
FROM rounds
WHERE id = 'your-round-uuid';
```

---

## 15. Database Relationships

```
players (1) ←─────────────── (N) game_players (N) ──────── (1) games
                                                                  │
                                                                  │ (1)
                                                                  ▼
                                                              rounds (N)
                                                                  │
                                                    ┌─────────────┴────────────┐
                                                    │                          │
                                                  turns (N)          round_movie_usage (N)
                                                    │                          │
                                                    └─────────── movies (1) ───┘

Views (read-only):
  round_scoreboard     ← turns + game_players + players
  all_time_scoreboard  ← turns + games + game_players + players
  round_history        ← rounds + games + players + movies + round_scoreboard
```
