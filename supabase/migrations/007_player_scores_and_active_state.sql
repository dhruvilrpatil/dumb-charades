-- =============================================================================
-- MIGRATION 007: PLAYER SCORES & PERSISTENT DATA
-- Adds score, guessed_count, pass_count, and is_active columns to players table.
-- =============================================================================

ALTER TABLE players ADD COLUMN IF NOT EXISTS score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS guessed_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS pass_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Ensure anonymous client has full select, insert, update, delete permissions on players
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'players' AND policyname = 'players_delete_anon'
  ) THEN
    CREATE POLICY "players_delete_anon" ON players FOR DELETE TO anon USING (true);
  END IF;
END
$$;

GRANT ALL ON players TO anon, authenticated;
