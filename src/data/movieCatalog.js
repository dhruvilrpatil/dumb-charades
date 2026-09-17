import moviesData from './movies.json'

export const movies = moviesData

export const ERAS = ['All Eras', '80s', '90s', '2000s']
export const DIFFICULTIES = ['All Difficulties', 'Easy', 'Medium', 'Hard', 'Bizarre']
export const DURATIONS = [60, 90, 120]

/**
 * Filters the catalog based on era and difficulty settings.
 * If a particular combination is empty, returns all movies matching the era or all movies
 * as a graceful fallback.
 */
export function getFilteredMovies({ era = 'All Eras', difficulty = 'All Difficulties' } = {}) {
  const filtered = movies.filter((movie) => {
    const matchesEra = era === 'All Eras' || movie.era === era
    const matchesDiff =
      difficulty === 'All Difficulties' ||
      difficulty === 'All' ||
      movie.difficulty.toLowerCase() === difficulty.toLowerCase()
    return matchesEra && matchesDiff
  })

  if (filtered.length > 0) {
    return filtered
  }

  // Graceful fallback if exact filter combination yields nothing
  const eraFiltered = movies.filter((m) => era === 'All Eras' || m.era === era)
  return eraFiltered.length > 0 ? eraFiltered : movies
}
