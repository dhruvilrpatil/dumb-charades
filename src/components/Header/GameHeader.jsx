import React from 'react'
import { Home, Trophy, Flag, RotateCcw } from 'lucide-react'

export default function GameHeader({
  gameState,
  activePlayer,
  onOpenScoreDrawer,
  onEndRound,
  onResetToLobby,
  onGoHome,
}) {
  const { roundNumber, turnNumber, screen } = gameState

  // Completely remove the empty/redundant header on the Lobby / Home screen
  if (screen === 'lobby') {
    return null
  }

  const isPlaying = screen === 'turn'

  return (
    <header className="sticky top-0 z-30 w-full bg-[#fafafa] border-b border-[#ebebeb]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-3">

        {/* Top-Left: Home Button & Round/Turn info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onGoHome || onResetToLobby}
            className="btn-sm btn-press text-[#171717] bg-[#ffffff] border border-[#ebebeb] hover:bg-[#fafafa] hover:border-[#d4d4d4] flex items-center gap-1.5 shadow-[0px_1px_1px_rgba(0,0,0,0.04)] shrink-0"
            title="Return to Home (round is saved)"
          >
            <Home className="w-3.5 h-3.5 text-[#4d4d4d]" />
            <span className="font-medium">Home</span>
          </button>

          {isPlaying && (
            <>
              <span className="text-[#ebebeb] select-none">/</span>
              <div className="flex items-center gap-1.5 text-[12px] text-[#8f8f8f] font-mono truncate">
                <span className="font-semibold text-[#171717]">Round {roundNumber}</span>
                <span className="text-[#ebebeb]">·</span>
                <span>Turn {turnNumber}</span>
              </div>
            </>
          )}
        </div>

        {/* Active Player — centered on turn screen */}
        {isPlaying && activePlayer && (
          <div className="hidden sm:flex items-center gap-2 h-[30px] px-3 bg-[#ffffff] border border-[#ebebeb] rounded-full text-[12px] text-[#171717] font-medium shadow-[0px_1px_1px_rgba(0,0,0,0.04)] animate-scale-in">
            <span
              className="w-2 h-2 rounded-full shrink-0 animate-pulse-gentle"
              style={{ backgroundColor: activePlayer.color }}
            />
            <span>{activePlayer.name}</span>
            <span className="text-[#8f8f8f] font-mono">{activePlayer.score}pts</span>
          </div>
        )}

        {/* Right Controls: Scores & End Round */}
        <div className="flex items-center gap-2 shrink-0">
          {isPlaying && (
            <>
              <button
                type="button"
                onClick={onOpenScoreDrawer}
                className="btn-sm btn-press text-[#171717] bg-[#ffffff] border border-[#ebebeb] hover:bg-[#fafafa] hover:border-[#d4d4d4] shadow-[0px_1px_1px_rgba(0,0,0,0.04)]"
                title="View active scoreboard"
              >
                <Trophy className="w-3.5 h-3.5 text-[#8f8f8f]" />
                <span className="hidden xs:inline">Scores</span>
              </button>
              <button
                type="button"
                onClick={onEndRound}
                className="btn-sm btn-press text-[#171717] bg-[#ffffff] border border-[#ebebeb] hover:text-[#ee0000] hover:border-[#ee0000]/40 hover:bg-[#fff5f5] shadow-[0px_1px_1px_rgba(0,0,0,0.04)]"
                title="End & save this round (can be continued anytime)"
              >
                <Flag className="w-3.5 h-3.5 text-[#ee0000]" />
                <span>End Round</span>
              </button>
            </>
          )}
          {screen === 'results' && (
            <button
              type="button"
              onClick={onResetToLobby}
              className="btn-sm btn-press text-[#8f8f8f] bg-[#ffffff] border border-[#ebebeb] hover:text-[#171717] hover:bg-[#fafafa] hover:border-[#d4d4d4]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Setup
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
