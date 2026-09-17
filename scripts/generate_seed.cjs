const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'src', 'data', 'movies.json');
const rawData = fs.readFileSync(jsonPath, 'utf8');
const movies = JSON.parse(rawData);

// Deduplicate exact duplicates (same title, year, language)
const uniqueMap = new Map();
for (const m of movies) {
  const key = m.title.trim().toLowerCase() + '::' + m.year + '::' + (m.language || 'Hindi').toLowerCase();
  if (!uniqueMap.has(key)) {
    uniqueMap.set(key, m);
  } else {
    // If existing has fewer actors, replace with one with more actors
    const existing = uniqueMap.get(key);
    if ((m.actors || []).length > (existing.actors || []).length) {
      uniqueMap.set(key, m);
    }
  }
}

const cleanMovies = [...uniqueMap.values()];
console.log(`Loaded ${movies.length} movies. Unique entries: ${cleanMovies.length}`);

// Generate SQL rows
const rows = cleanMovies.map((m) => {
  const safeTitle = m.title.replace(/'/g, "''");
  const era = m.era.toLowerCase();
  const diff = m.difficulty.toLowerCase();
  const lang = (m.language || 'Hindi').replace(/'/g, "''");
  const actorsArr = (m.actors || []).map((a) => `'${a.replace(/'/g, "''")}'`).join(', ');
  const actorsSql = actorsArr ? `ARRAY[${actorsArr}]` : 'NULL';
  const uuidSeed = `${m.id}-${m.title}-${m.year}`;
  const safeUuidSeed = uuidSeed.replace(/'/g, "''");
  return `(md5('${safeUuidSeed}')::uuid, '${safeTitle}', ${m.year}, '${era}', '${diff}', '${lang}', ${actorsSql})`;
});

// 1. Build supabase/seed.sql
const seedSql = `-- =============================================================================
-- SEED: MOVIES CATALOG (${cleanMovies.length} FILMS)
-- Includes Hindi, Marathi, and Gujarati films across 80s / 90s / 2000s eras.
-- Run in Supabase SQL Editor after running migrations.
-- =============================================================================

INSERT INTO movies (id, title, year, era, difficulty, language, actors) VALUES
${rows.join(',\n')}
ON CONFLICT (title, year, language) DO UPDATE SET
  era = EXCLUDED.era,
  difficulty = EXCLUDED.difficulty,
  actors = EXCLUDED.actors;
`;

fs.writeFileSync(path.join(__dirname, '..', 'supabase', 'seed.sql'), seedSql, 'utf8');
console.log('Updated supabase/seed.sql successfully.');

// 2. Build supabase/migrations/006_update_movies_catalog.sql
const migrationSql = `-- =============================================================================
-- MIGRATION 006: UPDATE MOVIES CATALOG (${cleanMovies.length} FILMS)
-- Adds language and actors columns if missing, updates constraints, and seeds catalog.
-- =============================================================================

-- 1. Ensure language and actors columns exist on movies table
ALTER TABLE movies 
ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'Hindi',
ADD COLUMN IF NOT EXISTS actors TEXT[] NULL;

-- 2. Update unique constraint so regional remakes/same titles across years/languages are allowed
ALTER TABLE movies DROP CONSTRAINT IF EXISTS movies_title_key;
ALTER TABLE movies DROP CONSTRAINT IF EXISTS movies_title_year_lang_key;
ALTER TABLE movies ADD CONSTRAINT movies_title_year_lang_key UNIQUE (title, year, language);

-- 3. Create language index for fast filtering
CREATE INDEX IF NOT EXISTS idx_movies_language ON movies (language);

-- 4. Upsert all movies
INSERT INTO movies (id, title, year, era, difficulty, language, actors) VALUES
${rows.join(',\n')}
ON CONFLICT (title, year, language) DO UPDATE SET
  era = EXCLUDED.era,
  difficulty = EXCLUDED.difficulty,
  actors = EXCLUDED.actors;
`;

fs.writeFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '006_update_movies_catalog.sql'), migrationSql, 'utf8');
console.log('Created supabase/migrations/006_update_movies_catalog.sql successfully.');
