import React, { useState, useEffect } from 'react'
import { X, Trophy, Award, Medal, Flame, RotateCcw } from 'lucide-react'
import { getAllTimeScoreboard, resetAllTimeScoreboard } from '../../lib/storageUtils'

export default function AllTimeScoreboardModal({ isOpen, onClose, onReset }) {
  const [standings, setStandings] = useState([])
  const [isConfirming, setIsConfirming] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setStandings(getAllTimeScoreboard())
      setIsConfirming(false)
    }
  }, [isOpen])

  const handleConfirmReset = () => {
    resetAllTimeScoreboard()
    setStandings([])
    setIsConfirming(false)
    if (onReset) onReset()
  }

  if (!isOpen) return null

  const getRankBadge = (rank) => {
    if (rank === 1) {
      return (
        <span className="w-6 h-6 rounded-full bg-[#f5a623]/15 text-[#d97706] border border-[#f5a623]/30 flex items-center justify-center text-[11px] font-bold font-mono">
          1
        </span>
      )
    }
    if (rank === 2) {
      return (
        <span className="w-6 h-6 rounded-full bg-[#8f8f8f]/15 text-[#4d4d4d] border border-[#8f8f8f]/30 flex items-center justify-center text-[11px] font-bold font-mono">
          2
        </span>
      )
    }
    if (rank === 3) {
      return (
        <span className="w-6 h-6 rounded-full bg-[#dd5b00]/15 text-[#c2410c] border border-[#dd5b00]/30 flex items-center justify-center text-[11px] font-bold font-mono">
          3
        </span>
      )
    }
    return (
      <span className="w-6 h-6 rounded-full text-[#a1a1a1] flex items-center justify-center text-[11px] font-mono">
        {rank}
      </span>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#171717]/30 backdrop-blur-[2px] transition-opacity cursor-pointer animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-[#ffffff] border border-[#ebebeb] rounded-[12px] shadow-[0px_4px_16px_rgba(0,0,0,0.08)] z-10 overflow-hidden flex flex-col max-h-[85vh] animate-scale-in">

        {/* Header */}
        <div className="px-5 py-4 border-b border-[#ebebeb] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[8px] bg-[#171717] text-white flex items-center justify-center shadow-[0px_1px_2px_rgba(0,0,0,0.1)]">
              <Trophy className="w-4 h-4 text-[#f5a623]" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-[#171717] tracking-[-0.28px]">
                All-Time Scoreboard
              </h2>
              <p className="text-[12px] text-[#8f8f8f] mt-0.5">
                Cumulative scores across all rounds and tournaments
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="btn-icon-sm btn-press text-[#8f8f8f] hover:text-[#171717] hover:bg-[#fafafa]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-5 space-y-2.5 overflow-y-auto flex-1">
          {standings.length === 0 ? (
            <div className="py-12 text-center">
              <Award className="w-8 h-8 text-[#a1a1a1] mx-auto mb-2 opacity-50" />
              <p className="text-[14px] font-medium text-[#171717]">No records yet</p>
              <p className="text-[12px] text-[#8f8f8f] mt-1">
                Play rounds and score points to populate the all-time leaderboard.
              </p>
            </div>
          ) : (
            standings.map((player, idx) => (
              <div
                key={player.name}
                className={`p-3.5 bg-[#fafafa] border border-[#ebebeb] rounded-[8px] flex items-center justify-between gap-3 card-interactive animate-fade-up ${
                  idx === 0 ? 'border-[#f5a623]/40 bg-[#fffdf5]' : ''
                }`}
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                {/* Left: Rank & Player info */}
                <div className="flex items-center gap-3 min-w-0">
                  {getRankBadge(idx + 1)}
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: player.color || '#0070f3' }}
                  />
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#171717] truncate">
                      {player.name}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-[#8f8f8f] font-mono mt-0.5">
                      <span>{player.roundsWon || 0} wins</span>
                      <span className="text-[#ebebeb]">·</span>
                      <span>{player.roundsPlayed || 0} rounds</span>
                    </div>
                  </div>
                </div>

                {/* Right: Score breakdown */}
                <div className="text-right shrink-0">
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="font-mono text-[18px] font-bold text-[#171717]">
                      {player.totalScore}
                    </span>
                    <span className="font-mono text-[11px] text-[#8f8f8f]">pts</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-[#8f8f8f] font-mono justify-end">
                    <span title="Acting points (+10 each)">
                      Act: <strong>{player.actingScore || 0}</strong>
                    </span>
                    <span className="text-[#ebebeb]">·</span>
                    <span title="Guessing points (+20 each)">
                      Guess: <strong>{player.guessingScore || 0}</strong>
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#ebebeb] bg-[#fafafa] flex items-center justify-between gap-3 shrink-0">
          <div>
            {standings.length > 0 && (
              !isConfirming ? (
                <button
                  type="button"
                  onClick={() => setIsConfirming(true)}
                  className="btn-sm btn-press text-[#ee0000] hover:bg-[#fff5f5] border border-[#ffcccc] bg-white flex items-center gap-1.5 text-[12px]"
                  title="Reset scoreboard and all recorded scores"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Scoreboard</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 animate-fade-up">
                  <button
                    type="button"
                    onClick={handleConfirmReset}
                    className="btn-sm btn-press text-white bg-[#ee0000] hover:bg-[#cc0000] text-[12px] font-medium shadow-[0px_1px_2px_rgba(238,0,0,0.2)]"
                  >
                    Confirm Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirming(false)}
                    className="btn-sm btn-press text-[#8f8f8f] hover:text-[#171717] bg-white border border-[#ebebeb] text-[12px]"
                  >
                    Cancel
                  </button>
                </div>
              )
            )}
            {standings.length === 0 && (
              <div className="text-[11px] text-[#8f8f8f] flex items-center gap-1.5 font-mono">
                <Flame className="w-3 h-3 text-[#ff4d4d]" />
                <span>Actor +10 pts · Guesser +20 pts</span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-sm btn-press text-[#4d4d4d] hover:text-[#171717] border border-[#ebebeb] bg-white hover:bg-[#fafafa]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
