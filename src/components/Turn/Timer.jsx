import React from 'react'
import { Play, Pause } from 'lucide-react'
import { formatTime } from '../../game/gameUtils'

export default function Timer({ timer, totalDuration, isPaused, onTogglePause, isTimeUp }) {
  const pct = Math.max(0, Math.min(100, (timer / totalDuration) * 100))
  const isFinal = timer <= 5 && timer > 0 && !isTimeUp

  return (
    <div className="bg-[#ffffff] border border-[#ebebeb] rounded-[12px] p-5 shadow-[0px_1px_1px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between gap-4">

        {/* Timer digits */}
        <div className="flex items-center gap-4">
          <div
            className={`font-mono text-[32px] sm:text-[40px] font-semibold leading-none tracking-[-1px] transition-colors ${
              isTimeUp
                ? 'text-[#ee0000] animate-pulse-ring'
                : isFinal
                ? 'text-[#f5a623]'
                : isPaused
                ? 'text-[#8f8f8f]'
                : 'text-[#171717]'
            }`}
          >
            {formatTime(timer)}
          </div>
          <div className="text-[12px] text-[#8f8f8f]">
            {isTimeUp ? (
              <span className="text-[#ee0000] font-medium">Time up</span>
            ) : isPaused ? (
              'Paused'
            ) : isFinal ? (
              <span className="text-[#f5a623] font-medium">Hurry</span>
            ) : (
              `of ${totalDuration}s`
            )}
          </div>
        </div>

        {/* Pause/Resume */}
        {!isTimeUp && (
          <button
            type="button"
            onClick={onTogglePause}
            aria-label={isPaused ? 'Resume' : 'Pause'}
            className={`btn-md btn-press border ${
              isPaused
                ? 'bg-[#171717] text-white border-[#171717] hover:bg-[#2d2d2d] shadow-[0px_1px_2px_rgba(0,0,0,0.06)]'
                : 'bg-[#ffffff] text-[#4d4d4d] border-[#ebebeb] hover:bg-[#fafafa] hover:border-[#d4d4d4] hover:text-[#171717]'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
            {isPaused ? 'Resume' : 'Pause'}
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full h-[3px] bg-[#f2f2f2] rounded-full overflow-hidden mt-4">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background:
              isTimeUp || pct < 20
                ? '#ee0000'
                : isFinal || pct < 40
                ? '#f5a623'
                : '#171717',
          }}
        />
      </div>
    </div>
  )
}
