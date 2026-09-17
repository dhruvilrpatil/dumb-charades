import React from 'react'
import { ShieldOff } from 'lucide-react'

export default function PrivacyReveal({ activePlayer, roundNumber, turnNumber, onReveal }) {
  return (
    <div className="w-full max-w-lg mx-auto px-6 py-12 animate-fade-up">
      <div className="bg-[#ffffff] border border-[#ebebeb] rounded-[12px] p-8 sm:p-12 text-center shadow-[0px_1px_1px_rgba(0,0,0,0.04)] space-y-8">

        {/* Turn badge */}
        <div className="inline-flex items-center gap-2 h-6 px-3 bg-[#fafafa] border border-[#ebebeb] rounded-[100px]">
          <span className="font-mono text-[11px] text-[#8f8f8f] uppercase tracking-wider">
            Round {roundNumber} · Turn {turnNumber}
          </span>
        </div>

        {/* Actor */}
        <div className="space-y-2">
          <div
            className="mx-auto w-14 h-14 rounded-full flex items-center justify-center shadow-[0px_2px_2px_rgba(0,0,0,0.06),0px_8px_16px_-4px_rgba(0,0,0,0.06)] animate-scale-in"
            style={{ backgroundColor: activePlayer.color }}
          >
            <span className="text-white text-[22px] font-semibold select-none animate-pulse-gentle">
              {activePlayer.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-[12px] text-[#8f8f8f] font-mono uppercase tracking-wider mb-1">Acting</p>
            <h1 className="text-[32px] font-semibold text-[#171717] tracking-[-1.28px] leading-[40px]">
              {activePlayer.name}
            </h1>
          </div>
        </div>

        {/* Privacy notice */}
        <div className="text-left px-4 py-3 bg-[#fafafa] border border-[#ebebeb] rounded-[6px] flex items-start gap-3 animate-fade-up delay-1">
          <ShieldOff className="w-4 h-4 text-[#8f8f8f] mt-0.5 shrink-0" />
          <p className="text-[13px] text-[#4d4d4d] leading-[20px]">
            Pass the phone to <strong className="font-medium text-[#171717]">{activePlayer.name}</strong>. Keep screen private from guessers. Timer starts on reveal.
          </p>
        </div>

        {/* Reveal CTA */}
        <button
          type="button"
          onClick={onReveal}
          className="btn-lg btn-press w-full text-white bg-[#171717] hover:bg-[#2d2d2d] shadow-[0px_2px_4px_rgba(0,0,0,0.08)] animate-fade-up delay-2"
        >
          Reveal Film
        </button>
      </div>
    </div>
  )
}
