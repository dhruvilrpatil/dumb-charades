import { getFilteredMovies } from '../data/movieCatalog'

// Vercel Geist accent palette for player avatars
export const PLAYER_COLORS = [
  '#007cf0', // Blue (gradient-develop-start)
  '#7928ca', // Violet (gradient-preview-start)
  '#ff0080', // Pink (gradient-preview-end)
  '#00dfd8', // Cyan (gradient-develop-end)
  '#ff4d4d', // Red (gradient-ship-start)
  '#f9cb28', // Amber (gradient-ship-end)
  '#50e3c2', // Cyan-light
  '#eb367f', // Magenta
]

export const DEFAULT_SUGGESTED_NAMES = [
  'Raj',
  'Simran',
  'Kabir',
  'Pooja',
  'Rahul',
  'Geet',
  'Bunty',
  'Babli',
]

export function getPlayerColor(index) {
  return PLAYER_COLORS[index % PLAYER_COLORS.length]
}

/**
 * Cryptographically secure random integer in range [0, max - 1].
 * Falls back to Math.random() in environments without crypto.
 */
function getSecureRandomIndex(length) {
  if (length <= 1) return 0
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const randomBuffer = new Uint32Array(1)
    crypto.getRandomValues(randomBuffer)
    return randomBuffer[0] % length
  }
  return Math.floor(Math.random() * length)
}

/**
 * Fisher-Yates array shuffle using secure random.
 */
export function shuffleArray(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = getSecureRandomIndex(i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Completely randomized movie selection respecting filters.
 * Ensures uniform distribution across the entire catalog and prevents repeats.
 * When all eligible movies are used, gracefully resets the pool without interrupting play.
 */
export function chooseMovie(settings, usedIds = []) {
  const eligible = getFilteredMovies(settings)
  if (!eligible.length) {
    return { movie: null, nextUsedIds: usedIds, resetPool: false }
  }

  const unplayed = eligible.filter((movie) => !usedIds.includes(movie.id))
  let pool = unplayed.length > 0 ? unplayed : eligible

  // If pool was reset because all were used, avoid immediately repeating the exact last movie
  if (unplayed.length === 0 && pool.length > 1 && usedIds.length > 0) {
    const lastPlayedId = usedIds[usedIds.length - 1]
    const withoutLast = pool.filter((m) => m.id !== lastPlayedId)
    if (withoutLast.length > 0) {
      pool = withoutLast
    }
  }

  // Shuffle pool with cryptographic randomness
  const shuffled = shuffleArray(pool)
  const randomIndex = getSecureRandomIndex(shuffled.length)
  const movie = shuffled[randomIndex]

  return {
    movie,
    nextUsedIds: unplayed.length > 0 ? [...usedIds, movie.id] : [movie.id],
    resetPool: unplayed.length === 0,
  }
}

export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds))
  const mins = Math.floor(s / 60)
  const secs = s % 60
  if (mins > 0) {
    return `${mins}:${String(secs).padStart(2, '0')}`
  }
  return `${secs}s`
}

export function vibrate(pattern = [50]) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern)
    }
  } catch {
    // Gracefully ignore devices without vibration support
  }
}

// Single cached AudioContext for browser compatibility
let audioContextInstance = null

function getAudioContext() {
  if (typeof window === 'undefined') return null
  if (!audioContextInstance) {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (AudioContext) {
      audioContextInstance = new AudioContext()
    }
  }
  if (audioContextInstance && audioContextInstance.state === 'suspended') {
    audioContextInstance.resume().catch(() => {})
  }
  return audioContextInstance
}

/**
 * Synthesize distinct sound cues using the Web Audio API.
 * Guarantees zero latency and no missing file dependencies.
 */
export function playCue(kind = 'tick') {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    if (kind === 'tick') {
      // Gentle tick for regular countdown
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(520, now)
      gain.gain.setValueAtTime(0.025, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.05)
    } else if (kind === 'warning') {
      // Crisper warning beep for the final 5 seconds
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(880, now)
      gain.gain.setValueAtTime(0.08, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.09)
    } else if (kind === 'timeout') {
      // Game over buzzer
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(190, now)
      osc.frequency.linearRampToValueAtTime(140, now + 0.4)
      gain.gain.setValueAtTime(0.09, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.4)
    } else if (kind === 'correct') {
      // Uplifting major two-tone chime (C5 to E5)
      const osc1 = ctx.createOscillator()
      const gain = ctx.createGain()

      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(523.25, now) // C5
      osc1.frequency.setValueAtTime(659.25, now + 0.09) // E5

      gain.gain.setValueAtTime(0.07, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)

      osc1.connect(gain).connect(ctx.destination)
      osc1.start(now)
      osc1.stop(now + 0.3)
    } else if (kind === 'pass') {
      // Soft muted click/skip sound
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(360, now)
      osc.frequency.linearRampToValueAtTime(260, now + 0.14)
      gain.gain.setValueAtTime(0.05, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.14)
    } else if (kind === 'reveal') {
      // Crisp swoosh / soft bell
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, now) // D5
      gain.gain.setValueAtTime(0.06, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.16)
    }
  } catch {
    // Audio is an enhancement; gracefully handle user interaction restrictions
  }
}
