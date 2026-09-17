import React, { useState, useEffect, useRef, useCallback } from 'react'
import GameHeader from './components/Header/GameHeader'
import Lobby from './components/Lobby/Lobby'
import TurnScreen from './components/Turn/TurnScreen'
import ScoreDrawer from './components/ScoreDrawer/ScoreDrawer'
import RoundResults from './components/Results/RoundResults'
import NewRoundDialog from './components/Results/NewRoundDialog'
import GuesserSelectModal from './components/Turn/GuesserSelectModal'
import RoundHistoryModal from './components/History/RoundHistoryModal'
import AllTimeScoreboardModal from './components/Scoreboard/AllTimeScoreboardModal'
import Footer from './components/Footer/Footer'
import {
  saveRoundSession,
  getLatestResumableRound,
} from './lib/storageUtils'
import {
  getPlayerColor,
  chooseMovie,
  playCue,
  vibrate,
} from './game/gameUtils'
import {
  loadPlayers,
  addPlayer,
  removePlayer,
  updatePlayerScores,
  resetPlayerScores,
  getCachedPlayers,
  saveCachedPlayers,
  DEFAULT_PLAYERS,
} from './lib/playerRepository'

export default function App() {
  // Screen state: 'lobby' | 'turn' | 'results'
  const [screen, setScreen] = useState('lobby')

  // Active round session ID for persistence
  const [activeRoundSessionId, setActiveRoundSessionId] = useState(null)

  // Persistent Players list: initialized from cache for instant zero-flicker render
  const [players, setPlayers] = useState(() => {
    return getCachedPlayers() || DEFAULT_PLAYERS
  })

  // Hydrate players from Supabase DB on mount
  useEffect(() => {
    let isMounted = true
    loadPlayers().then((dbPlayers) => {
      if (isMounted && dbPlayers && dbPlayers.length > 0) {
        setPlayers(dbPlayers)
      }
    })
    return () => {
      isMounted = false
    }
  }, [])

  // Game configuration
  const [settings, setSettings] = useState({
    duration: 60,
    era: 'All Eras',
    difficulty: 'All Difficulties',
  })

  // Turn management
  const [playerIndex, setPlayerIndex] = useState(0)
  const [roundNumber, setRoundNumber] = useState(1)
  const [turnNumber, setTurnNumber] = useState(1)

  // Current Turn State
  const [currentMovie, setCurrentMovie] = useState(null)
  const [usedMovieIds, setUsedMovieIds] = useState([])
  const [isRevealed, setIsRevealed] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [timer, setTimer] = useState(60)
  const [isTimeUp, setIsTimeUp] = useState(false)

  // Turn logs for current round / game
  const [turnLogs, setTurnLogs] = useState([])

  // Drawer and Dialogs
  const [isScoreDrawerOpen, setIsScoreDrawerOpen] = useState(false)
  const [isNewRoundDialogOpen, setIsNewRoundDialogOpen] = useState(false)
  const [isGuesserModalOpen, setIsGuesserModalOpen] = useState(false)
  const [isRoundHistoryModalOpen, setIsRoundHistoryModalOpen] = useState(false)
  const [isAllTimeScoreboardModalOpen, setIsAllTimeScoreboardModalOpen] = useState(false)

  // Resumable round in storage
  const [resumableRound, setResumableRound] = useState(null)

  // Flag to avoid recursive back navigation during popstate handling
  const isHandlingPopstateRef = useRef(false)
  // Ref to always hold fresh round state without closure staleness
  const latestSessionStateRef = useRef({})

  // Update session state ref continuously
  useEffect(() => {
    latestSessionStateRef.current = {
      activeRoundSessionId,
      roundNumber,
      turnNumber,
      playerIndex,
      players,
      currentMovie,
      usedMovieIds,
      settings,
      turnLogs,
    }
  })

  // Helper to persist current round state to storage
  const persistActiveRound = useCallback((overrideState = {}) => {
    const s = latestSessionStateRef.current
    const session = saveRoundSession({
      id: s.activeRoundSessionId || activeRoundSessionId,
      roundNumber: s.roundNumber || roundNumber,
      turnNumber: s.turnNumber || turnNumber,
      playerIndex: typeof s.playerIndex === 'number' ? s.playerIndex : playerIndex,
      players: s.players || players,
      currentMovie: s.currentMovie || currentMovie,
      usedMovieIds: s.usedMovieIds || usedMovieIds,
      settings: s.settings || settings,
      turnLogs: s.turnLogs || turnLogs,
      status: 'in_progress',
      ...overrideState,
    })
    if (session?.id) {
      setActiveRoundSessionId(session.id)
      setResumableRound(session)
    }
    return session
  }, [activeRoundSessionId, currentMovie, playerIndex, players, roundNumber, settings, turnLogs, turnNumber, usedMovieIds])

  // Modal helpers synchronized with browser / mobile history stack
  const openModal = useCallback((modalName, setter) => {
    setter(true)
    const currentDepth = window.history.state?.depth || 0
    window.history.pushState(
      { screen, modal: modalName, depth: currentDepth + 1 },
      ''
    )
  }, [screen])

  const closeModal = useCallback((modalName, setter) => {
    setter(false)
    if (!isHandlingPopstateRef.current && window.history.state?.modal === modalName) {
      window.history.back()
    }
  }, [])

  // Check storage for any resumable rounds on mount / lobby visit
  useEffect(() => {
    if (screen === 'lobby') {
      setResumableRound(getLatestResumableRound())
    }
  }, [screen])

  // Mobile Back Button / HTML5 History popstate listener
  useEffect(() => {
    // 1. Establish the homepage ('lobby') as the root state at depth 0
    if (!window.history.state || typeof window.history.state.depth === 'undefined') {
      window.history.replaceState({ screen: 'lobby', depth: 0 }, '')
    }

    // 2. Listen to back / forward actions
    const handlePopState = (event) => {
      isHandlingPopstateRef.current = true
      const state = event.state || { screen: 'lobby', depth: 0 }
      const targetScreen = state.screen || 'lobby'

      // A. Close any open dialogs/modals/drawers on back button press
      setIsScoreDrawerOpen(false)
      setIsNewRoundDialogOpen(false)
      setIsGuesserModalOpen(false)
      setIsRoundHistoryModalOpen(false)
      setIsAllTimeScoreboardModalOpen(false)

      // B. Transition screens if navigating between pages
      setScreen((prevScreen) => {
        if (prevScreen === 'turn' && targetScreen !== 'turn') {
          setIsPaused(true)
          setIsRevealed(false)
          // Persist current round so it can be resumed immediately
          persistActiveRound({ status: 'in_progress' })
        }
        return targetScreen
      })

      setTimeout(() => {
        isHandlingPopstateRef.current = false
      }, 50)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [persistActiveRound])

  // Ref for timer interval
  const timerIntervalRef = useRef(null)

  // Active Player
  const activePlayer = players[playerIndex] || players[0]

  // Setup a brand new turn (with a fresh chosen movie)
  const prepareNextTurn = useCallback(
    (nextIdx, nextTurnNum, currentUsedIds) => {
      const { movie, nextUsedIds } = chooseMovie(settings, currentUsedIds)
      setPlayerIndex(nextIdx)
      setTurnNumber(nextTurnNum)
      setCurrentMovie(movie)
      setUsedMovieIds(nextUsedIds)
      setIsRevealed(false)
      setIsPaused(false)
      setIsTimeUp(false)
      setTimer(settings.duration)
    },
    [settings]
  )

  // Add a new player (persisted to Supabase DB and local storage)
  const handleAddPlayer = async (name) => {
    if (!name.trim()) return
    const color = getPlayerColor(players.length)
    const newPlayer = await addPlayer(name, color)
    setPlayers((prev) => {
      const updated = [...prev, newPlayer]
      saveCachedPlayers(updated)
      return updated
    })
    vibrate([30])
  }

  // Remove a player (persisted to Supabase DB and local storage)
  const handleRemovePlayer = async (id) => {
    await removePlayer(id)
    setPlayers((prev) => {
      const updated = prev.filter((p) => p.id !== id)
      saveCachedPlayers(updated)
      return updated
    })
    vibrate([30])
  }

  // Update Game Settings
  const handleUpdateSettings = (newSettings) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings }
      if (newSettings.duration && screen === 'lobby') {
        setTimer(newSettings.duration)
      }
      return updated
    })
  }

  // Start a Fresh Game / Round
  const handleStartGame = () => {
    if (players.length < 2) return

    playCue('reveal')
    vibrate([50])

    const { movie, nextUsedIds } = chooseMovie(settings, [])
    const newSessionId = `round-${Date.now()}`
    setActiveRoundSessionId(newSessionId)
    setPlayerIndex(0)
    setRoundNumber(1)
    setTurnNumber(1)
    setCurrentMovie(movie)
    setUsedMovieIds(nextUsedIds)
    setIsRevealed(false)
    setIsPaused(false)
    setIsTimeUp(false)
    setTimer(settings.duration)
    setTurnLogs([])
    setScreen('turn')

    // Push turn screen to history stack at depth 1
    window.history.pushState({ screen: 'turn', depth: 1 }, '')

    // Initial persistence checkpoint
    saveRoundSession({
      id: newSessionId,
      roundNumber: 1,
      turnNumber: 1,
      playerIndex: 0,
      players,
      currentMovie: movie,
      usedMovieIds: nextUsedIds,
      settings,
      turnLogs: [],
      status: 'in_progress',
    })
  }

  // Resume an existing round from storage
  const handleResumeRound = (roundSession) => {
    if (!roundSession) return

    // Close any modal that may have triggered resume
    setIsRoundHistoryModalOpen(false)

    setActiveRoundSessionId(roundSession.id)
    setPlayers(roundSession.players || players)
    setSettings(roundSession.settings || settings)
    setRoundNumber(roundSession.roundNumber || 1)
    setTurnNumber(roundSession.turnNumber || 1)
    setPlayerIndex(roundSession.playerIndex || 0)
    setCurrentMovie(roundSession.currentMovie)
    setUsedMovieIds(roundSession.usedMovieIds || [])
    setTurnLogs(roundSession.turnLogs || [])
    setTimer(roundSession.settings?.duration || settings.duration)
    setIsRevealed(false)
    setIsPaused(false)
    setIsTimeUp(false)
    setScreen('turn')

    if (window.history.state?.modal) {
      window.history.replaceState({ screen: 'turn', depth: 1 }, '')
    } else {
      window.history.pushState({ screen: 'turn', depth: 1 }, '')
    }

    playCue('reveal')
    vibrate([50])
  }

  // Tap to Reveal Movie
  const handleReveal = () => {
    playCue('reveal')
    vibrate([50])
    setIsRevealed(true)
    setIsPaused(false)
  }

  // Toggle Pause/Resume
  const handleTogglePause = () => {
    playCue('tick')
    vibrate([30])
    setIsPaused((prev) => !prev)
  }

  // Trigger Guesser Prompt on Correct
  const handleRequestGuesser = () => {
    if (!activePlayer) return
    setIsPaused(true)
    openModal('guesserModal', setIsGuesserModalOpen)
  }

  // Handle Guesser Selected (+10 for Actor, +20 for Guesser, fresh movie next turn)
  const handleSelectGuesser = (guesser) => {
    setIsGuesserModalOpen(false)
    if (!isHandlingPopstateRef.current && window.history.state?.modal === 'guesserModal') {
      window.history.back()
    }
    playCue('correct')
    vibrate([50])

    const timeTaken = Math.max(1, settings.duration - timer)

    // 1. Record turn log with two-sided points
    const newLog = {
      turn: turnNumber,
      round: roundNumber,
      playerId: activePlayer.id,
      actorId: activePlayer.id,
      actorName: activePlayer.name,
      guesserId: guesser.id,
      guesserName: guesser.name,
      movieTitle: currentMovie?.title || 'Unknown',
      result: 'correct',
      actorPoints: 10,
      guesserPoints: 20,
      timeTaken,
    }
    const updatedLogs = [newLog, ...turnLogs]
    setTurnLogs(updatedLogs)

    // 2. Award 10 pts to Actor and 20 pts to Guesser
    const updatedPlayers = players.map((p) => {
      let updatedScore = p.score
      let updatedGuessedCount = p.guessedCount || 0

      if (p.id === activePlayer.id) {
        updatedScore += 10
        updatedGuessedCount += 1
      }
      if (p.id === guesser.id) {
        updatedScore += 20
      }

      return {
        ...p,
        score: updatedScore,
        guessedCount: updatedGuessedCount,
      }
    })
    setPlayers(updatedPlayers)
    updatePlayerScores(updatedPlayers)

    // 3. Advance to next player with fresh movie
    const nextIdx = (playerIndex + 1) % updatedPlayers.length
    const nextTurn = turnNumber + 1

    const { movie: nextMovie, nextUsedIds } = chooseMovie(settings, usedMovieIds)
    setPlayerIndex(nextIdx)
    setTurnNumber(nextTurn)
    setCurrentMovie(nextMovie)
    setUsedMovieIds(nextUsedIds)
    setIsRevealed(false)
    setIsPaused(false)
    setIsTimeUp(false)
    setTimer(settings.duration)

    // 4. Checkpoint round session
    saveRoundSession({
      id: activeRoundSessionId,
      roundNumber,
      turnNumber: nextTurn,
      playerIndex: nextIdx,
      players: updatedPlayers,
      currentMovie: nextMovie,
      usedMovieIds: nextUsedIds,
      settings,
      turnLogs: updatedLogs,
      status: 'in_progress',
    })
  }

  // Handle Pass: Actor changes, 0 pts, but the MOVIE REMAINS THE SAME!
  const handlePass = () => {
    if (!activePlayer) return

    playCue('pass')
    vibrate([40])

    const timeTaken = Math.max(1, settings.duration - timer)

    // 1. Record turn log for pass (failed actor gets 0 pts, movie retained)
    const newLog = {
      turn: turnNumber,
      round: roundNumber,
      playerId: activePlayer.id,
      actorId: activePlayer.id,
      actorName: activePlayer.name,
      movieTitle: currentMovie?.title || 'Unknown',
      result: 'pass',
      actorPoints: 0,
      guesserPoints: 0,
      movieRetained: true,
      timeTaken,
    }
    const updatedLogs = [newLog, ...turnLogs]
    setTurnLogs(updatedLogs)

    // 2. Increment pass count for current actor (no points awarded)
    const updatedPlayers = players.map((p) =>
      p.id === activePlayer.id
        ? {
            ...p,
            passCount: (p.passCount || 0) + 1,
          }
        : p
    )
    setPlayers(updatedPlayers)
    updatePlayerScores(updatedPlayers)

    // 3. Next actor in rotation, BUT CURRENT MOVIE REMAINS UNCHANGED!
    const nextIdx = (playerIndex + 1) % updatedPlayers.length
    const nextTurn = turnNumber + 1

    setPlayerIndex(nextIdx)
    setTurnNumber(nextTurn)
    // currentMovie is explicitly retained!
    setIsRevealed(false)
    setIsPaused(false)
    setIsTimeUp(false)
    setTimer(settings.duration)

    // 4. Checkpoint round session
    saveRoundSession({
      id: activeRoundSessionId,
      roundNumber,
      turnNumber: nextTurn,
      playerIndex: nextIdx,
      players: updatedPlayers,
      currentMovie,
      usedMovieIds,
      settings,
      turnLogs: updatedLogs,
      status: 'in_progress',
    })
  }

  // End Round manually from header (saves round for later continuation)
  const handleEndRound = () => {
    playCue('reveal')
    vibrate([60])

    // Save as in_progress/resumable session
    persistActiveRound({ status: 'in_progress' })
    setScreen('results')
    window.history.pushState({ screen: 'results', depth: 2 }, '')
  }

  // Go to Home (Top-left Home button or Back to Lobby)
  const handleGoHome = () => {
    if (screen === 'turn') {
      setIsPaused(true)
      // Save round so user can continue anytime from homepage
      persistActiveRound({ status: 'in_progress' })
    }
    setIsRevealed(false)
    setIsPaused(false)

    const currentDepth = window.history.state?.depth || 0
    if (currentDepth > 0) {
      window.history.go(-currentDepth)
    } else {
      setScreen('lobby')
      window.history.replaceState({ screen: 'lobby', depth: 0 }, '')
    }
  }

  // Start Next Round: Continue Tournament
  const handleContinueTournament = () => {
    setIsNewRoundDialogOpen(false)
    const nextRoundNum = roundNumber + 1
    setRoundNumber(nextRoundNum)
    prepareNextTurn(0, turnNumber + 1, usedMovieIds)
    setScreen('turn')
    playCue('reveal')

    // Reset history depth to 1 for the new turn
    window.history.replaceState({ screen: 'turn', depth: 1 }, '')

    persistActiveRound({
      roundNumber: nextRoundNum,
      turnNumber: turnNumber + 1,
      playerIndex: 0,
      status: 'in_progress',
    })
  }

  // Start Next Round: Reset Tournament
  const handleResetTournament = () => {
    setIsNewRoundDialogOpen(false)
    const resetPlayers = resetPlayerScores(players)
    setPlayers(resetPlayers)
    setRoundNumber(1)
    setTurnNumber(1)
    setTurnLogs([])
    prepareNextTurn(0, 1, [])
    setScreen('turn')
    playCue('reveal')

    // Reset history depth to 1 for the fresh tournament
    window.history.replaceState({ screen: 'turn', depth: 1 }, '')

    const newId = `round-${Date.now()}`
    setActiveRoundSessionId(newId)
    saveRoundSession({
      id: newId,
      roundNumber: 1,
      turnNumber: 1,
      playerIndex: 0,
      players: resetPlayers,
      currentMovie,
      usedMovieIds: [],
      settings,
      turnLogs: [],
      status: 'in_progress',
    })
  }

  // Timer Tick Effect
  useEffect(() => {
    if (screen === 'turn' && isRevealed && !isPaused && !isTimeUp) {
      timerIntervalRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current)
            setIsTimeUp(true)
            playCue('timeout')
            vibrate([100, 50, 100])
            return 0
          }

          const next = prev - 1
          if (next <= 5 && next > 0) {
            playCue('warning')
            vibrate([40])
          }

          return next
        })
      }, 1000)
    } else {
      clearInterval(timerIntervalRef.current)
    }

    return () => clearInterval(timerIntervalRef.current)
  }, [screen, isRevealed, isPaused, isTimeUp])

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return

      if (e.code === 'Space' && screen === 'turn' && isRevealed && !isTimeUp) {
        e.preventDefault()
        handleTogglePause()
      } else if (e.code === 'Enter' && screen === 'turn' && !isRevealed) {
        e.preventDefault()
        handleReveal()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [screen, isRevealed, isTimeUp])

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#171717] flex flex-col font-sans selection:bg-[#0070f3]/15 selection:text-[#171717]">
      {/* 1. Header (Hidden on Lobby, with Home Button in top-left and End Round in top-right) */}
      <GameHeader
        gameState={{ screen, roundNumber, turnNumber, players }}
        activePlayer={activePlayer}
        onOpenScoreDrawer={() => openModal('scoreDrawer', setIsScoreDrawerOpen)}
        onEndRound={handleEndRound}
        onResetToLobby={handleGoHome}
        onGoHome={handleGoHome}
      />

      {/* 2. Main Body Content */}
      <main className="flex-1 flex flex-col justify-center pb-12">
        {screen === 'lobby' && (
          <Lobby
            players={players}
            onAddPlayer={handleAddPlayer}
            onRemovePlayer={handleRemovePlayer}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onStartGame={handleStartGame}
            onContinueRound={handleResumeRound}
            onOpenScoreboard={() => openModal('scoreboardModal', setIsAllTimeScoreboardModalOpen)}
            onOpenHistory={() => openModal('historyModal', setIsRoundHistoryModalOpen)}
            resumableRound={resumableRound}
          />
        )}

        {screen === 'turn' && (
          <TurnScreen
            activePlayer={activePlayer}
            roundNumber={roundNumber}
            turnNumber={turnNumber}
            isRevealed={isRevealed}
            currentMovie={currentMovie}
            timer={timer}
            totalDuration={settings.duration}
            isPaused={isPaused}
            isTimeUp={isTimeUp}
            onReveal={handleReveal}
            onTogglePause={handleTogglePause}
            onCorrect={handleRequestGuesser}
            onPass={handlePass}
          />
        )}

        {screen === 'results' && (
          <RoundResults
            gameState={{ players, roundNumber, turnLogs }}
            onOpenNewRoundDialog={() => openModal('newRoundDialog', setIsNewRoundDialogOpen)}
            onBackToLobby={handleGoHome}
          />
        )}
      </main>

      {/* Footer — 2D sketch graphic & credits */}
      <Footer />

      {/* 3. Non-destructive Score Drawer */}
      <ScoreDrawer
        isOpen={isScoreDrawerOpen}
        onClose={() => closeModal('scoreDrawer', setIsScoreDrawerOpen)}
        players={players}
        turnLogs={turnLogs}
      />

      {/* 4. Guesser Selection Modal (+10 Actor, +20 Guesser) */}
      <GuesserSelectModal
        isOpen={isGuesserModalOpen}
        onClose={() => {
          closeModal('guesserModal', (val) => {
            setIsGuesserModalOpen(val)
            if (!val) setIsPaused(false)
          })
        }}
        actingPlayer={activePlayer}
        players={players}
        onSelectGuesser={handleSelectGuesser}
      />

      {/* 5. Round History by Timestamp Modal */}
      <RoundHistoryModal
        isOpen={isRoundHistoryModalOpen}
        onClose={() => closeModal('historyModal', setIsRoundHistoryModalOpen)}
        onResumeRound={handleResumeRound}
      />

      {/* 6. All-Time Scoreboard Modal */}
      <AllTimeScoreboardModal
        isOpen={isAllTimeScoreboardModalOpen}
        onClose={() => closeModal('scoreboardModal', setIsAllTimeScoreboardModalOpen)}
        onReset={() => {
          const reset = resetPlayerScores(players)
          setPlayers(reset)
          setTurnLogs([])
        }}
      />

      {/* 7. New Round Dialog */}
      <NewRoundDialog
        isOpen={isNewRoundDialogOpen}
        onClose={() => closeModal('newRoundDialog', setIsNewRoundDialogOpen)}
        onContinueTournament={handleContinueTournament}
        onResetTournament={handleResetTournament}
        currentRound={roundNumber}
      />
    </div>
  )
}

