import React, { useState } from 'react'
import { X, Play, Clock, ChevronDown, Trash2, CheckCircle2, XCircle, ArrowRight } from 'lucide-react'
import { getSavedRounds, deleteSavedRound } from '../../lib/storageUtils'

export default function RoundHistoryModal({
  isOpen,
  onClose,
  onResumeRound,
}) {
  const [rounds, setRounds] = useState([])
  const [expandedRoundId, setExpandedRoundId] = useState(null)

  // Refresh saved rounds whenever opened
  React.useEffect(() => {
    if (isOpen) {
      setRounds(getSavedRounds())
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleDelete = (e, roundId) => {
    e.stopPropagation()
    deleteSavedRound(roundId)
    setRounds(getSavedRounds())
  }

  const toggleExpand = (id) => {
    setExpandedRoundId((prev) => (prev === id ? null : id))
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
          <div>
            <h2 className="text-[15px] font-semibold text-[#171717] tracking-[-0.28px]">
              Round History by Timestamp
            </h2>
            <p className="text-[12px] text-[#8f8f8f] mt-0.5">
              Select any past round to view details or resume gameplay
            </p>
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

        {/* Scrollable round list */}
        <div className="p-5 space-y-3 overflow-y-auto flex-1">
          {rounds.length === 0 ? (
            <div className="py-12 text-center">
              <Clock className="w-8 h-8 text-[#a1a1a1] mx-auto mb-2 opacity-50" />
              <p className="text-[14px] font-medium text-[#171717]">No saved rounds yet</p>
              <p className="text-[12px] text-[#8f8f8f] mt-1">
                Start a round and tap &quot;End Round&quot; or return home to save your progress.
              </p>
            </div>
          ) : (
            rounds.map((rnd) => {
              const isExpanded = expandedRoundId === rnd.id
              const sortedPlayers = [...(rnd.players || [])].sort((a, b) => b.score - a.score)
              const topPlayer = sortedPlayers[0]

              return (
                <div
                  key={rnd.id}
                  className="bg-[#fafafa] border border-[#ebebeb] rounded-[8px] overflow-hidden transition-all"
                >
                  {/* Round summary card header */}
                  <div
                    onClick={() => toggleExpand(rnd.id)}
                    className="p-4 cursor-pointer hover:bg-[#f2f2f2] transition-colors flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[14px] text-[#171717]">
                          Round {rnd.roundNumber}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium ${
                            rnd.status === 'in_progress'
                              ? 'bg-[#0070f3]/10 text-[#0070f3] border border-[#0070f3]/20'
                              : 'bg-[#ebebeb] text-[#4d4d4d]'
                          }`}
                        >
                          {rnd.status === 'in_progress' ? 'Resumable' : 'Completed'}
                        </span>
                      </div>

                      {/* Timestamp */}
                      <div className="flex items-center gap-1.5 text-[11px] text-[#8f8f8f] font-mono mt-1">
                        <Clock className="w-3 h-3" />
                        <span>{rnd.savedAt}</span>
                      </div>

                      {/* Leader & player count */}
                      <div className="mt-2 flex items-center gap-2 text-[12px] text-[#4d4d4d]">
                        <span>{rnd.players?.length || 0} players</span>
                        <span className="text-[#ebebeb]">·</span>
                        {topPlayer && (
                          <span className="truncate">
                            Leader: <strong className="font-medium text-[#171717]">{topPlayer.name}</strong> ({topPlayer.score}pts)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, rnd.id)}
                        aria-label="Delete round"
                        className="btn-icon-sm btn-press text-[#a1a1a1] hover:text-[#ee0000] hover:bg-[#fff5f5]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ChevronDown
                        className={`w-4 h-4 text-[#8f8f8f] transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </div>

                  {/* Expanded detail view */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-[#ebebeb] bg-[#ffffff] space-y-3 animate-fade-up">
                      {/* Player scores */}
                      <div>
                        <p className="font-mono text-[10px] text-[#8f8f8f] uppercase tracking-wider mb-1.5">
                          Standings
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {sortedPlayers.map((p, i) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between p-2 bg-[#fafafa] border border-[#ebebeb] rounded-[6px] text-[12px]"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono text-[10px] text-[#a1a1a1]">{i + 1}</span>
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: p.color }}
                                />
                                <span className="font-medium text-[#171717] truncate">{p.name}</span>
                              </div>
                              <span className="font-mono font-semibold text-[#171717] ml-2">
                                {p.score}pts
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Turn logs if any */}
                      {rnd.turnLogs && rnd.turnLogs.length > 0 && (
                        <div>
                          <p className="font-mono text-[10px] text-[#8f8f8f] uppercase tracking-wider mb-1.5">
                            Turns Played ({rnd.turnLogs.length})
                          </p>
                          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                            {rnd.turnLogs.map((log, lIdx) => (
                              <div
                                key={lIdx}
                                className="flex items-center justify-between p-1.5 text-[11px] bg-[#fafafa] border border-[#ebebeb] rounded-[4px]"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {log.result === 'correct' ? (
                                    <CheckCircle2 className="w-3 h-3 text-[#0070f3] shrink-0" />
                                  ) : (
                                    <XCircle className="w-3 h-3 text-[#ee0000] shrink-0" />
                                  )}
                                  <span className="font-medium text-[#171717] truncate">{log.movieTitle}</span>
                                </div>
                                <span className="text-[#8f8f8f] font-mono shrink-0 ml-2">
                                  {log.result === 'correct'
                                    ? `+10 ${log.actorName} · +20 ${log.guesserName || ''}`
                                    : `Pass by ${log.actorName}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Resume button */}
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            onResumeRound(rnd)
                          }}
                          className="btn-md btn-press w-full bg-[#171717] text-white hover:bg-[#2d2d2d] flex items-center justify-center gap-2 shadow-[0px_1px_2px_rgba(0,0,0,0.06)]"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Resume This Round</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#ebebeb] bg-[#fafafa] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="btn-md btn-press w-full text-[#4d4d4d] hover:text-[#171717] border border-[#ebebeb] hover:bg-[#ffffff]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
