import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export default function MovieCard({ movie }) {
  const [showCast, setShowCast] = useState(false)

  if (!movie) return null

  const diffColor = {
    Easy: '#007cf0',
    Medium: '#7928ca',
    Hard: '#ff4d4d',
    Bizarre: '#ff0080',
  }[movie.difficulty] || '#8f8f8f'

  return (
    <div className="bg-[#ffffff] border border-[#ebebeb] rounded-[12px] p-6 sm:p-8 shadow-[0px_1px_1px_rgba(0,0,0,0.04)] text-center space-y-5 animate-scale-in">

      {/* Metadata badges */}
      <div className="flex flex-wrap items-center justify-center gap-2 animate-fade-up">
        <span className="inline-flex items-center h-6 px-2.5 font-mono text-[11px] text-[#8f8f8f] bg-[#fafafa] border border-[#ebebeb] rounded-[6px]">
          {movie.year}
        </span>
        <span className="inline-flex items-center h-6 px-2.5 font-mono text-[11px] text-[#8f8f8f] bg-[#fafafa] border border-[#ebebeb] rounded-[6px]">
          {movie.era}
        </span>
        {movie.language && (
          <span className="inline-flex items-center h-6 px-2.5 font-mono text-[11px] text-[#171717] bg-[#fafafa] border border-[#ebebeb] rounded-[6px]">
            {movie.language}
          </span>
        )}
        <span
          className="inline-flex items-center gap-1.5 h-6 px-2.5 font-mono text-[11px] bg-[#fafafa] border border-[#ebebeb] rounded-[6px]"
          style={{ color: diffColor }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: diffColor }}
          />
          {movie.difficulty}
        </span>
      </div>

      {/* Film title — the most prominent element */}
      <div className="py-2 animate-fade-up delay-1">
        <p className="font-mono text-[11px] text-[#8f8f8f] uppercase tracking-wider mb-2">Film</p>
        <h2 className="text-[32px] sm:text-[48px] font-semibold text-[#171717] tracking-[-1.28px] sm:tracking-[-2.4px] leading-[1.05] select-none">
          {movie.title}
        </h2>
      </div>

      {/* Cast — collapsible */}
      {movie.actors && movie.actors.length > 0 && (
        <div className="animate-fade-up delay-2">
          <button
            type="button"
            onClick={() => setShowCast((s) => !s)}
            className="btn-press inline-flex items-center gap-1 text-[12px] text-[#8f8f8f] hover:text-[#171717] transition-colors"
          >
            Cast
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${showCast ? 'rotate-180' : ''}`}
            />
          </button>
          {showCast && (
            <p className="mt-2 text-[13px] text-[#4d4d4d] animate-fade-up">
              {movie.actors.join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
