import React from 'react'
import { Check, SkipForward } from 'lucide-react'

export default function TurnActions({ onCorrect, onPass, isTimeUp, isPaused }) {
  if (isTimeUp) {
    return (
      <div className="bg-[#ffffff] border border-[#ee0000]/30 rounded-[12px] p-6 shadow-[0px_1px_1px_rgba(0,0,0,0.04)] space-y-4 animate-scale-in">
        <div className="text-center">
          <p className="font-mono text-[11px] text-[#ee0000] uppercase tracking-wider mb-1">Time&apos;s up</p>
          <p className="text-[13px] text-[#4d4d4d]">Was the film guessed before the buzzer?</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCorrect}
            className="btn-lg btn-press text-white bg-[#171717] hover:bg-[#2d2d2d] shadow-[0px_2px_4px_rgba(0,0,0,0.08)]"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            Guessed it (+10 / +20)
          </button>
          <button
            type="button"
            onClick={onPass}
            className="btn-lg btn-press text-[#4d4d4d] bg-[#ffffff] border border-[#ebebeb] hover:bg-[#fafafa] hover:border-[#d4d4d4] hover:text-[#171717] shadow-[0px_1px_1px_rgba(0,0,0,0.04)]"
          >
            <SkipForward className="w-4 h-4" />
            Pass (Keep Film) — 0 pts
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-slide-up">
      <button
        type="button"
        onClick={onPass}
        className="btn-lg btn-press text-[#4d4d4d] bg-[#ffffff] border border-[#ebebeb] hover:bg-[#fafafa] hover:border-[#d4d4d4] hover:text-[#171717] shadow-[0px_1px_1px_rgba(0,0,0,0.04)] order-2 sm:order-1"
      >
        <SkipForward className="w-4 h-4" />
        Pass (Keep Film)
      </button>
      <button
        type="button"
        onClick={onCorrect}
        className="btn-lg btn-press text-white bg-[#171717] hover:bg-[#2d2d2d] shadow-[0px_2px_4px_rgba(0,0,0,0.08)] order-1 sm:order-2"
      >
        <Check className="w-4 h-4 stroke-[2.5]" />
        Correct (+10 / +20)
      </button>
    </div>
  )
}
