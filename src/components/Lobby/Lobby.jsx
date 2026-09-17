import React, { useState } from 'react'
import { Plus, Trash2, Play, AlertCircle, Trophy, Clock, RotateCcw } from 'lucide-react'
import { ERAS, DURATIONS, getFilteredMovies } from '../../data/movieCatalog'

export default function Lobby({
  players,
  onAddPlayer,
  onRemovePlayer,
  settings,
  onUpdateSettings,
  onStartGame,
  onContinueRound,
  onOpenScoreboard,
  onOpenHistory,
}) {
  const [newPlayerName, setNewPlayerName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const handleAdd = (e) => {
    if (e) e.preventDefault()
    const trimmed = newPlayerName.trim()
    if (!trimmed) { setErrorMsg('Enter a name.'); return }
    if (players.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMsg('Name already exists.')
      return
    }
    onAddPlayer(trimmed)
    setNewPlayerName('')
    setErrorMsg('')
  }

  const eligibleMovies = getFilteredMovies(settings)
  const canStart = players.length >= 2

  return (
    <div className="w-full max-w-4xl mx-auto px-6 py-8 sm:py-12 animate-fade-up">

      {/* Hero — Clean Minimalist Title */}
      <div className="mb-8 pt-2">
        <h1 className="text-[54px] sm:text-[72px] font-bold leading-[0.92] tracking-[-3px] text-[#171717] select-none">
          Dumb<br />Charades
        </h1>
      </div>

      {/* Action Buttons: All-Time Scoreboard & Round History */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        <button
          type="button"
          onClick={onOpenScoreboard}
          className="h-11 px-4 text-[13px] font-medium text-[#171717] bg-[#ffffff] border border-[#ebebeb] hover:bg-[#fafafa] hover:border-[#d4d4d4] rounded-[8px] flex items-center justify-center gap-2 shadow-[0px_1px_1px_rgba(0,0,0,0.04)] btn-press"
        >
          <Trophy className="w-4 h-4 text-[#f5a623]" />
          <span>All-Time Scoreboard</span>
        </button>
        <button
          type="button"
          onClick={onOpenHistory}
          className="h-11 px-4 text-[13px] font-medium text-[#171717] bg-[#ffffff] border border-[#ebebeb] hover:bg-[#fafafa] hover:border-[#d4d4d4] rounded-[8px] flex items-center justify-center gap-2 shadow-[0px_1px_1px_rgba(0,0,0,0.04)] btn-press"
        >
          <Clock className="w-4 h-4 text-[#0070f3]" />
          <span>Round History</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Players — left column (7/12) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#ffffff] border border-[#ebebeb] rounded-[12px] overflow-hidden shadow-[0px_1px_1px_rgba(0,0,0,0.04)]">
            {/* Card header */}
            <div className="px-6 py-4 border-b border-[#ebebeb] flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-[#171717] tracking-[-0.28px]">Players</h2>
              <span className="font-mono text-[11px] text-[#8f8f8f]">
                {players.length} {players.length === 1 ? 'player' : 'players'}
              </span>
            </div>

            {/* Input */}
            <div className="px-6 py-5 space-y-3 border-b border-[#ebebeb]">
              <form onSubmit={handleAdd} className="flex gap-2">
                <input
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => { setNewPlayerName(e.target.value); if (errorMsg) setErrorMsg('') }}
                  placeholder="Player name"
                  maxLength={24}
                  className="flex-1 h-[36px] px-3 text-[13px] bg-[#ffffff] text-[#171717] placeholder-[#a1a1a1] border border-[#ebebeb] rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#0070f3] focus:border-transparent transition-all"
                />
                <button
                  type="submit"
                  disabled={!newPlayerName.trim()}
                  className="btn-md btn-press text-white bg-[#171717] hover:bg-[#2d2d2d] disabled:opacity-40 disabled:hover:bg-[#171717] shadow-[0px_1px_1px_rgba(0,0,0,0.04)]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </form>

              {errorMsg && (
                <div className="flex items-center gap-1.5 text-[12px] text-[#ee0000] animate-fade-up">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errorMsg}
                </div>
              )}
            </div>

            {/* Player list */}
            {players.length === 0 ? (
              <div className="px-6 py-10 text-center animate-fade-in">
                <p className="text-[13px] text-[#8f8f8f]">No players. Add at least 2 to start.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#ebebeb]">
                {players.map((player, idx) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between px-6 py-3 hover:bg-[#fafafa] transition-colors animate-fade-up"
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-[11px] text-[#a1a1a1] w-4 text-center">{idx + 1}</span>
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: player.color }}
                      />
                      <span className="text-[14px] font-medium text-[#171717] truncate">{player.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemovePlayer(player.id)}
                      aria-label={`Remove ${player.name}`}
                      className="btn-icon-sm btn-press text-[#a1a1a1] hover:text-[#ee0000] hover:bg-[#fff5f5]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Settings — right column (5/12) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#ffffff] border border-[#ebebeb] rounded-[12px] overflow-hidden shadow-[0px_1px_1px_rgba(0,0,0,0.04)] card-interactive">
            <div className="px-6 py-4 border-b border-[#ebebeb] flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-[#171717] tracking-[-0.28px]">Settings</h2>
              <span className="font-mono text-[11px] text-[#8f8f8f]">{eligibleMovies.length} films</span>
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* Turn Duration */}
              <div className="space-y-2">
                <label className="font-mono text-[11px] font-medium text-[#8f8f8f] uppercase tracking-wider block">
                  Duration
                </label>
                <div className="flex gap-2">
                  {DURATIONS.map((seconds) => (
                    <button
                      key={seconds}
                      type="button"
                      onClick={() => onUpdateSettings({ duration: seconds })}
                      className={`btn-md btn-press flex-1 border ${
                        settings.duration === seconds
                          ? 'bg-[#171717] text-white border-[#171717] shadow-[0px_1px_2px_rgba(0,0,0,0.06)]'
                          : 'bg-[#ffffff] text-[#4d4d4d] border-[#ebebeb] hover:bg-[#fafafa] hover:border-[#d4d4d4]'
                      }`}
                    >
                      {seconds}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Era */}
              <div className="space-y-2">
                <label className="font-mono text-[11px] font-medium text-[#8f8f8f] uppercase tracking-wider block">
                  Era
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ERAS.map((era) => (
                    <button
                      key={era}
                      type="button"
                      onClick={() => onUpdateSettings({ era })}
                      className={`btn-md btn-press border ${
                        settings.era === era
                          ? 'bg-[#171717] text-white border-[#171717] shadow-[0px_1px_2px_rgba(0,0,0,0.06)]'
                          : 'bg-[#ffffff] text-[#4d4d4d] border-[#ebebeb] hover:bg-[#fafafa] hover:border-[#d4d4d4]'
                      }`}
                    >
                      {era}
                    </button>
                  ))}
                </div>
              </div>


              {/* Scoring reference */}
              <div className="pt-2 border-t border-[#ebebeb] space-y-1.5 font-mono text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-[#8f8f8f]">Acting (if guessed)</span>
                  <span className="font-semibold text-[#171717]">+10 pts</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8f8f8f]">Guesser (who answered)</span>
                  <span className="font-semibold text-[#0070f3]">+20 pts</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8f8f8f]">Pass (movie retained)</span>
                  <span className="text-[#a1a1a1]">0 pts</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="space-y-2.5">
            <button
              type="button"
              disabled={!canStart}
              onClick={onStartGame}
              className="btn-lg btn-press w-full text-white bg-[#171717] hover:bg-[#2d2d2d] disabled:opacity-40 disabled:hover:bg-[#171717] shadow-[0px_2px_4px_rgba(0,0,0,0.08)]"
            >
              <Play className="w-4 h-4 fill-current" />
              {canStart ? 'Start New Round' : 'Add 2+ Players to Start'}
            </button>

            <button
              type="button"
              onClick={() => (resumableRound ? onContinueRound(resumableRound) : onOpenHistory())}
              className="btn-lg btn-press w-full text-[#171717] bg-[#ffffff] border border-[#ebebeb] hover:bg-[#fafafa] hover:border-[#d4d4d4] shadow-[0px_1px_1px_rgba(0,0,0,0.04)]"
            >
              <RotateCcw className="w-4 h-4 text-[#8f8f8f]" />
              <span>Continue Existing Round</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
