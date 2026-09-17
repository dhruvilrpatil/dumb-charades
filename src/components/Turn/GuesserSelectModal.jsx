import React, { useEffect } from 'react'
import { X, Trophy } from 'lucide-react'

export default function GuesserSelectModal({
  isOpen,
  onClose,
  actingPlayer,
  players,
  onSelectGuesser,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Other players who could have guessed the film
  const eligibleGuessers = players.filter((p) => p.id !== actingPlayer?.id)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#171717]/30 backdrop-blur-[2px] transition-opacity cursor-pointer animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-sm bg-[#ffffff] border border-[#ebebeb] rounded-[12px] shadow-[0px_4px_16px_rgba(0,0,0,0.08)] z-10 overflow-hidden animate-scale-in">

        {/* Header */}
        <div className="px-5 py-4 border-b border-[#ebebeb] flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-[#171717] tracking-[-0.28px]">
              Who guessed the film?
            </h2>
            <p className="text-[12px] text-[#8f8f8f] mt-0.5">
              <span className="font-medium text-[#171717]">{actingPlayer?.name}</span> gets +10 · Guesser gets +20
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cancel"
            className="btn-icon-sm btn-press text-[#8f8f8f] hover:text-[#171717] hover:bg-[#fafafa]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Guesser List */}
        <div className="p-4 space-y-2 max-h-[320px] overflow-y-auto">
          {eligibleGuessers.map((player) => (
            <button
              key={player.id}
              type="button"
              onClick={() => onSelectGuesser(player)}
              className="btn-press w-full flex items-center justify-between p-3.5 bg-[#fafafa] border border-[#ebebeb] rounded-[8px] hover:border-[#171717] hover:bg-[#f2f2f2] group text-left card-interactive"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0 shadow-[0px_1px_2px_rgba(0,0,0,0.1)]"
                  style={{ backgroundColor: player.color }}
                />
                <span className="text-[14px] font-medium text-[#171717] truncate">
                  {player.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 bg-[#ffffff] border border-[#ebebeb] group-hover:border-[#171717] group-hover:bg-[#171717] group-hover:text-white px-2.5 py-1 rounded-full text-[11px] font-mono font-medium transition-colors">
                <Trophy className="w-3 h-3 text-[#f5a623] group-hover:text-white" />
                <span>+20 pts</span>
              </div>
            </button>
          ))}
        </div>

        {/* Footer / Cancel */}
        <div className="px-5 pb-4 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="btn-md btn-press w-full text-[#8f8f8f] hover:text-[#171717] border border-[#ebebeb] hover:bg-[#fafafa] hover:border-[#d4d4d4]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
