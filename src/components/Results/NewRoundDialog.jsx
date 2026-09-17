import React from 'react'
import { X, TrendingUp, RotateCcw } from 'lucide-react'

export default function NewRoundDialog({
  isOpen,
  onClose,
  onContinueTournament,
  onResetTournament,
  currentRound,
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#171717]/20 cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md bg-[#ffffff] border border-[#ebebeb] rounded-[12px] shadow-[0px_2px_2px_rgba(0,0,0,0.04),0px_8px_16px_-4px_rgba(0,0,0,0.08)] z-10 overflow-hidden animate-fade-up">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#ebebeb]">
          <div>
            <h2 className="text-[14px] font-semibold text-[#171717] tracking-[-0.28px]">
              Round {currentRound + 1}
            </h2>
            <p className="text-[12px] text-[#8f8f8f] mt-0.5">Continue or reset tournament</p>
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

        {/* Options */}
        <div className="p-5 space-y-3">
          <button
            type="button"
            onClick={onContinueTournament}
            className="btn-press w-full flex items-start gap-4 p-4 text-left bg-[#fafafa] border border-[#ebebeb] rounded-[8px] hover:border-[#171717] hover:bg-[#f2f2f2] group card-interactive animate-scale-in delay-1"
          >
            <div className="w-8 h-8 flex items-center justify-center bg-[#ffffff] border border-[#ebebeb] rounded-[6px] shrink-0 mt-0.5 group-hover:bg-[#171717] group-hover:border-[#171717] transition-colors">
              <TrendingUp className="w-4 h-4 text-[#4d4d4d] group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[#171717]">Continue Tournament</p>
              <p className="text-[12px] text-[#8f8f8f] mt-0.5 leading-[18px]">
                Keep cumulative scores. Continue to Round {currentRound + 1}.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={onResetTournament}
            className="btn-press w-full flex items-start gap-4 p-4 text-left bg-[#fafafa] border border-[#ebebeb] rounded-[8px] hover:border-[#ee0000]/40 hover:bg-[#fafafa] group card-interactive animate-scale-in delay-2"
          >
            <div className="w-8 h-8 flex items-center justify-center bg-[#ffffff] border border-[#ebebeb] rounded-[6px] shrink-0 mt-0.5 group-hover:bg-[#ee0000] group-hover:border-[#ee0000] transition-colors">
              <RotateCcw className="w-4 h-4 text-[#4d4d4d] group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[#171717]">Reset Scores</p>
              <p className="text-[12px] text-[#8f8f8f] mt-0.5 leading-[18px]">
                Clear all scores to 0. Start fresh with the same players.
              </p>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5">
          <button
            type="button"
            onClick={onClose}
            className="btn-md btn-press w-full text-[#4d4d4d] hover:text-[#171717] border border-[#ebebeb] hover:bg-[#fafafa] hover:border-[#d4d4d4]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
