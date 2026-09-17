import React, { useEffect } from 'react'
import { X, CheckCircle2, XCircle } from 'lucide-react'

export default function ScoreDrawer({ isOpen, onClose, players, turnLogs = [] }) {
  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    if (isOpen) window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#171717]/20 transition-opacity cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-sm bg-[#fafafa] border-l border-[#ebebeb] flex flex-col shadow-[0px_2px_2px_rgba(0,0,0,0.04),0px_8px_16px_-4px_rgba(0,0,0,0.08)] animate-slide-right">

          {/* Drawer header */}
          <div className="px-5 py-3.5 border-b border-[#ebebeb] flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-[#171717] tracking-[-0.28px]">Standings</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close scoreboard"
              className="btn-icon-sm btn-press text-[#8f8f8f] hover:text-[#171717] hover:bg-[#ebebeb]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">

            {/* Leaderboard */}
            <div className="px-5 py-4 border-b border-[#ebebeb]">
              <p className="font-mono text-[11px] text-[#8f8f8f] uppercase tracking-wider mb-3">Leaderboard</p>
              <div className="space-y-1">
                {sortedPlayers.map((player, index) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between px-3 py-2.5 bg-[#ffffff] border border-[#ebebeb] rounded-[6px] animate-fade-up"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono text-[11px] text-[#a1a1a1] w-4 text-center shrink-0">
                        {index + 1}
                      </span>
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: player.color }}
                      />
                      <span className="text-[13px] font-medium text-[#171717] truncate">
                        {player.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-[12px] text-[#8f8f8f]">
                        {player.guessedCount || 0}G · {player.passCount || 0}P
                      </span>
                      <span className="font-mono text-[14px] font-semibold text-[#171717]">
                        {player.score}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity log */}
            {turnLogs.length > 0 && (
              <div className="px-5 py-4">
                <p className="font-mono text-[11px] text-[#8f8f8f] uppercase tracking-wider mb-3">Activity</p>
                <div className="space-y-1 max-h-56 overflow-y-auto">
                  {turnLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 px-3 py-2 bg-[#ffffff] border border-[#ebebeb] rounded-[6px] text-[12px] animate-fade-up"
                      style={{ animationDelay: `${Math.min(idx, 6) * 30}ms` }}
                    >
                      {log.result === 'correct' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#0070f3] shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-[#ee0000] shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-[#171717]">{log.playerName}</span>
                        <span className="text-[#8f8f8f]"> — </span>
                        <span className="text-[#4d4d4d] italic">{log.movieTitle}</span>
                      </div>
                      <span
                        className={`font-mono shrink-0 ${
                          log.result === 'correct' ? 'text-[#0070f3]' : 'text-[#a1a1a1]'
                        }`}
                      >
                        {log.result === 'correct' ? '+10' : '0'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3.5 border-t border-[#ebebeb]">
            <button
              type="button"
              onClick={onClose}
              className="btn-md btn-press w-full text-[#171717] bg-[#ffffff] border border-[#ebebeb] hover:bg-[#fafafa] hover:border-[#d4d4d4] shadow-[0px_1px_1px_rgba(0,0,0,0.04)]"
            >
              Resume
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
