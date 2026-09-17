import React from 'react'
import { CheckCircle, SkipForward, Clock, ArrowRight, RotateCcw } from 'lucide-react'

export default function RoundResults({
  gameState,
  onOpenNewRoundDialog,
  onBackToLobby,
}) {
  const { players, roundNumber, turnLogs = [] } = gameState

  const rankedPlayers = [...players].sort((a, b) => b.score - a.score)

  const totalGuessed = turnLogs.filter((l) => l.result === 'correct').length
  const totalPasses = turnLogs.filter((l) => l.result !== 'correct').length
  const totalTurns = turnLogs.length
  const successRate = totalTurns > 0 ? Math.round((totalGuessed / totalTurns) * 100) : 0
  const totalTime = turnLogs.reduce((acc, l) => acc + (l.timeTaken || 0), 0)
  const avgTime = totalTurns > 0 ? Math.round(totalTime / totalTurns) : 0

  const rankLabel = (i) => {
    if (i === 0) return '1'
    if (i === 1) return '2'
    if (i === 2) return '3'
    return `${i + 1}`
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-6 py-10 space-y-6 animate-fade-up">

      {/* Round label */}
      <div>
        <p className="font-mono text-[11px] text-[#8f8f8f] uppercase tracking-wider mb-2">Round {roundNumber} Complete</p>
        <h1 className="text-[32px] font-semibold text-[#171717] tracking-[-1.28px] leading-[40px]">
          {rankedPlayers[0]?.name} leads
        </h1>
        <p className="text-[14px] text-[#4d4d4d] mt-1">
          {rankedPlayers[0]?.score} points
        </p>
      </div>

      {/* Statistics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: CheckCircle, label: 'Guessed', value: totalGuessed, color: '#0070f3' },
          { icon: SkipForward, label: 'Passed', value: totalPasses, color: '#8f8f8f' },
          { icon: CheckCircle, label: 'Success', value: `${successRate}%`, color: '#171717' },
          { icon: Clock, label: 'Avg Time', value: `${avgTime}s`, color: '#171717' },
        ].map(({ icon: Icon, label, value, color }, idx) => (
          <div
            key={label}
            className={`bg-[#ffffff] border border-[#ebebeb] rounded-[12px] p-4 shadow-[0px_1px_1px_rgba(0,0,0,0.04)] card-interactive animate-scale-in delay-${idx + 1}`}
          >
            <Icon className="w-4 h-4 mb-2" style={{ color }} />
            <p className="font-mono text-[24px] font-semibold text-[#171717] leading-none">{value}</p>
            <p className="font-mono text-[11px] text-[#8f8f8f] mt-1 uppercase tracking-wider">{label}</p>
          </div>
        ))}
      </div>

      {/* Leaderboard */}
      <div className="bg-[#ffffff] border border-[#ebebeb] rounded-[12px] overflow-hidden shadow-[0px_1px_1px_rgba(0,0,0,0.04)] card-interactive animate-fade-up delay-2">
        <div className="px-5 py-3 border-b border-[#ebebeb]">
          <p className="font-mono text-[11px] text-[#8f8f8f] uppercase tracking-wider">Rankings</p>
        </div>
        <div className="divide-y divide-[#ebebeb]">
          {rankedPlayers.map((player, idx) => (
            <div
              key={player.id}
              className="flex items-center justify-between px-5 py-3 hover:bg-[#fafafa] transition-colors animate-fade-up"
              style={{ animationDelay: `${idx * 40 + 100}ms` }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono text-[11px] text-[#a1a1a1] w-4 text-center">{rankLabel(idx)}</span>
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: player.color }}
                />
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-[#171717] truncate">{player.name}</p>
                  <p className="font-mono text-[11px] text-[#8f8f8f]">
                    {player.guessedCount || 0} correct
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="font-mono text-[16px] font-semibold text-[#171717]">{player.score}</span>
                <span className="font-mono text-[11px] text-[#8f8f8f] ml-1">pts</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 animate-slide-up delay-3">
        <button
          type="button"
          onClick={onBackToLobby}
          className="btn-lg btn-press w-full sm:flex-1 h-12 min-h-[48px] px-6 text-[#4d4d4d] bg-[#ffffff] border border-[#ebebeb] hover:bg-[#fafafa] hover:border-[#d4d4d4] hover:text-[#171717] shadow-[0px_1px_1px_rgba(0,0,0,0.04)]"
        >
          <RotateCcw className="w-4 h-4" />
          Setup
        </button>
        <button
          type="button"
          onClick={onOpenNewRoundDialog}
          className="btn-lg btn-press w-full sm:flex-1 h-12 min-h-[48px] px-6 text-white bg-[#171717] hover:bg-[#2d2d2d] shadow-[0px_2px_4px_rgba(0,0,0,0.08)]"
        >
          Next Round
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
