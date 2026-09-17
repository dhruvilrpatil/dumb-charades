import React from 'react'
import PrivacyReveal from './PrivacyReveal'
import MovieCard from './MovieCard'
import Timer from './Timer'
import TurnActions from './TurnActions'

export default function TurnScreen({
  activePlayer,
  roundNumber,
  turnNumber,
  isRevealed,
  currentMovie,
  timer,
  totalDuration,
  isPaused,
  isTimeUp,
  onReveal,
  onTogglePause,
  onCorrect,
  onPass,
}) {
  if (!isRevealed) {
    return (
      <PrivacyReveal
        activePlayer={activePlayer}
        roundNumber={roundNumber}
        turnNumber={turnNumber}
        onReveal={onReveal}
      />
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-4 animate-fade-up">

      {/* Active actor bar */}
      <div className="flex items-center justify-between bg-[#ffffff] border border-[#ebebeb] px-4 py-2.5 rounded-[6px] shadow-[0px_1px_1px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2.5">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: activePlayer.color }}
          />
          <span className="text-[13px] font-medium text-[#171717]">
            {activePlayer.name} is acting
          </span>
        </div>
        <span className="font-mono text-[11px] text-[#8f8f8f]">
          {activePlayer.score} pts
        </span>
      </div>

      {/* Timer */}
      <Timer
        timer={timer}
        totalDuration={totalDuration}
        isPaused={isPaused}
        onTogglePause={onTogglePause}
        isTimeUp={isTimeUp}
      />

      {/* Movie card */}
      <MovieCard movie={currentMovie} />

      {/* Actions */}
      <TurnActions
        onCorrect={onCorrect}
        onPass={onPass}
        isTimeUp={isTimeUp}
        isPaused={isPaused}
      />
    </div>
  )
}
