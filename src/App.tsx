import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getRound1Questions,
  getRound2HintQuestions,
  getRound3SpeedQuestions,
  type HintQuestion,
  type Language,
  type TriviaQuestion,
} from './data/questions'
import { SpinningWheel } from './components/SpinningWheel'

const LOGO_URL = '/bisk-logo.png'
const POINTS_PER_CORRECT = 10
const FINAL_SECONDS = 60
const FINAL_MAX_QUESTIONS = 12

type Phase = 'landing' | 'setup' | 'round1' | 'round2' | 'tiebreak' | 'final' | 'done'

type Team = {
  id: string
  name: string
  score: number
  r1Answered: number
  r2Answered: number
}

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.trunc(n)))
}

function stableId(prefix: string, i: number) {
  return `${prefix}-${i + 1}`
}

function getTopTwoTeams(teams: Team[]) {
  return [...teams].sort((a, b) => b.score - a.score).slice(0, 2)
}

/** True when we cannot uniquely determine top 2 (two or three teams tied). */
function hasTieForFinal(teams: Team[]): boolean {
  const sorted = [...teams].sort((a, b) => b.score - a.score)
  return sorted[0].score === sorted[1].score || sorted[1].score === sorted[2].score
}

function useTickBeep(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null)

  const beep = useCallback(() => {
    if (!enabled) return
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    if (!ctxRef.current) ctxRef.current = new AudioCtx()
    const ctx = ctxRef.current
    if (ctx.state === 'suspended') void ctx.resume()

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 520
    gain.gain.value = 0.015
    osc.connect(gain)
    gain.connect(ctx.destination)

    const t0 = ctx.currentTime
    osc.start(t0)
    osc.stop(t0 + 0.04)
  }, [enabled])

  return beep
}

function App() {
  const [phase, setPhase] = useState<Phase>('landing')
  const [language] = useState<Language>('en')

  const [teams, setTeams] = useState<Team[]>(() => [
    { id: stableId('team', 0), name: 'Team 1', score: 0, r1Answered: 0, r2Answered: 0 },
    { id: stableId('team', 1), name: 'Team 2', score: 0, r1Answered: 0, r2Answered: 0 },
    { id: stableId('team', 2), name: 'Team 3', score: 0, r1Answered: 0, r2Answered: 0 },
  ])

  const round1Target = 8
  const [activeTeamIdx, setActiveTeamIdx] = useState(0)

  const [wheelOpen, setWheelOpen] = useState(false)
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null)
  const [usedR1, setUsedR1] = useState<Set<number>>(() => new Set())
  const [showingAnswer, setShowingAnswer] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const round1 = useMemo(() => getRound1Questions(language), [language])
  const round2 = useMemo(() => getRound2HintQuestions(language), [language])
  const round3 = useMemo(() => getRound3SpeedQuestions(language), [language])

  const selectedR1Question = useMemo<TriviaQuestion | null>(() => {
    if (selectedNumber == null) return null
    return round1[selectedNumber - 1] ?? null
  }, [selectedNumber, round1])

  const activeTeam = teams[activeTeamIdx] ?? teams[0]
  const r1TeamBlocked = (activeTeam?.r1Answered ?? 0) >= round1Target
  const r1Done = useMemo(
    () => teams.every((t) => t.r1Answered >= round1Target) || usedR1.size >= round1.length,
    [teams, round1Target, usedR1.size, round1.length]
  )

  const closeModal = useCallback(() => {
    setShowingAnswer(false)
    setSelectedNumber(null)
  }, [])

  // ESC to close modal (same as Back — keep for later)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedNumber != null) {
          closeModal()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedNumber, closeModal])

  // Lock body scroll when modal open
  useEffect(() => {
    if (selectedNumber != null) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [selectedNumber])

  // Focus close button when modal opens (accessibility)
  useEffect(() => {
    if (selectedNumber != null && !showingAnswer) {
      const t = setTimeout(() => closeButtonRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [selectedNumber, showingAnswer])

  const markR1Answer = useCallback(
    (correct: boolean) => {
      if (!selectedR1Question) return
      const qId = selectedR1Question.id

      setUsedR1((prev) => {
        const next = new Set(prev)
        next.add(qId)
        return next
      })

      setTeams((prev) => {
        const next = [...prev]
        const t = next[activeTeamIdx]
        if (!t) return prev
        next[activeTeamIdx] = {
          ...t,
          score: t.score + (correct ? POINTS_PER_CORRECT : 0),
          r1Answered: t.r1Answered + 1,
        }
        return next
      })

      setShowingAnswer(false)
      setSelectedNumber(null)
    },
    [activeTeamIdx, selectedR1Question]
  )

  // Round 2 state
  const r2Assignments = useMemo(() => [0, 0, 1, 1, 2, 2] as const, [])
  const [usedR2, setUsedR2] = useState<Set<number>>(() => new Set())
  const [r2HintStep, setR2HintStep] = useState(0)
  const [r2SelectedId, setR2SelectedId] = useState<number | null>(null)
  const r2Selected = useMemo<HintQuestion | null>(() => {
    if (r2SelectedId == null) return null
    return round2.find((q) => q.id === r2SelectedId) ?? null
  }, [r2SelectedId, round2])

  const r2Done = useMemo(() => usedR2.size >= round2.length, [usedR2.size, round2.length])

  const startNextR2ForTeam = useCallback(
    (teamIdx: number) => {
      const availableForTeam = round2.filter((q, i) => r2Assignments[i] === teamIdx && !usedR2.has(q.id))
      const next = availableForTeam[0]
      if (!next) return
      setR2SelectedId(next.id)
      setR2HintStep(0)
      setShowingAnswer(false)
      setActiveTeamIdx(teamIdx)
    },
    [r2Assignments, round2, usedR2]
  )

  const markR2Answer = useCallback(
    (correct: boolean) => {
      if (!r2Selected) return
      const qId = r2Selected.id
      setUsedR2((prev) => {
        const next = new Set(prev)
        next.add(qId)
        return next
      })

      setTeams((prev) => {
        const next = [...prev]
        const t = next[activeTeamIdx]
        if (!t) return prev
        next[activeTeamIdx] = {
          ...t,
          score: t.score + (correct ? POINTS_PER_CORRECT : 0),
          r2Answered: t.r2Answered + 1,
        }
        return next
      })

      setR2SelectedId(null)
      setR2HintStep(0)
      setShowingAnswer(false)
    },
    [activeTeamIdx, r2Selected]
  )

  // Final (speed round) state
  const [finalQualifiedIds, setFinalQualifiedIds] = useState<string[] | null>(null)
  const qualifiers = useMemo(() => {
    if (!finalQualifiedIds) return []
    const order = finalQualifiedIds
    return teams
      .filter((t) => order.includes(t.id))
      .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
  }, [teams, finalQualifiedIds])
  const eliminatedTeams = useMemo(
    () =>
      finalQualifiedIds
        ? teams.filter((t) => !finalQualifiedIds.includes(t.id))
        : [],
    [teams, finalQualifiedIds]
  )
  const [tiebreakEliminatedId, setTiebreakEliminatedId] = useState<string | null>(null)
  const [finalTurnIdx, setFinalTurnIdx] = useState<0 | 1>(0)
  const [finalSecondsLeft, setFinalSecondsLeft] = useState(FINAL_SECONDS)
  const [finalRunning, setFinalRunning] = useState(false)
  const [finalAskedCount, setFinalAskedCount] = useState(0)
  const [finalUsed, setFinalUsed] = useState<Set<number>>(() => new Set())
  const [finalCurrentId, setFinalCurrentId] = useState<number | null>(null)
  const beep = useTickBeep(true)

  const resetAll = useCallback(() => {
    setTeams((prev) =>
      prev.map((t) => ({
        ...t,
        score: 0,
        r1Answered: 0,
        r2Answered: 0,
      }))
    )
    setActiveTeamIdx(0)
    setUsedR1(new Set())
    setSelectedNumber(null)
    setShowingAnswer(false)
    setWheelOpen(false)

    setUsedR2(new Set())
    setR2SelectedId(null)
    setR2HintStep(0)

    setTiebreakEliminatedId(null)
    setFinalQualifiedIds(null)
    setFinalTurnIdx(0)
    setFinalSecondsLeft(FINAL_SECONDS)
    setFinalRunning(false)
    setFinalAskedCount(0)
    setFinalUsed(new Set())
    setFinalCurrentId(null)

    setPhase('setup')
  }, [])

  // When entering the final, lock in the top 2 teams and reset the final-round session state.
  useEffect(() => {
    if (phase !== 'final') return
    setFinalQualifiedIds((prev) => {
      if (prev && prev.length === 2) return prev
      const topTwo = getTopTwoTeams(teams).slice(0, 2).map((t) => t.id)
      return topTwo
    })
    setFinalTurnIdx(0)
    setFinalSecondsLeft(FINAL_SECONDS)
    setFinalRunning(false)
    setFinalAskedCount(0)
    setFinalUsed(new Set())
    setFinalCurrentId(null)
    setShowingAnswer(false)
  }, [phase])

  const finalCurrentQuestion = useMemo<TriviaQuestion | null>(() => {
    if (finalCurrentId == null) return null
    return round3.find((q) => q.id === finalCurrentId) ?? null
  }, [finalCurrentId, round3])

  const finalActiveTeam = qualifiers[finalTurnIdx] ?? null

  const pickNextFinalQuestion = useCallback(() => {
    const available = round3.filter((q) => !finalUsed.has(q.id))
    if (available.length === 0) return null
    const picked = available[Math.floor(Math.random() * available.length)]
    return picked?.id ?? null
  }, [round3, finalUsed])

  const startFinalTurn = useCallback(() => {
    setFinalSecondsLeft(FINAL_SECONDS)
    setFinalAskedCount(0)
    setFinalRunning(true)
    setShowingAnswer(false)
    const first = pickNextFinalQuestion()
    if (first != null) {
      setFinalCurrentId(first)
      setFinalUsed((prev) => new Set(prev).add(first))
      setFinalAskedCount(1)
    }
  }, [pickNextFinalQuestion])

  const nextFinalQuestion = useCallback(() => {
    if (!finalRunning) return
    if (finalAskedCount >= FINAL_MAX_QUESTIONS) return
    const next = pickNextFinalQuestion()
    if (next == null) return
    setFinalCurrentId(next)
    setFinalUsed((prev) => new Set(prev).add(next))
    setFinalAskedCount((c) => c + 1)
    setShowingAnswer(false)
  }, [finalAskedCount, finalRunning, pickNextFinalQuestion])

  const markFinalAnswer = useCallback(
    (correct: boolean) => {
      if (!finalActiveTeam || !finalRunning) return
      if (correct) {
        setTeams((prev) =>
          prev.map((t) => (t.id === finalActiveTeam.id ? { ...t, score: t.score + POINTS_PER_CORRECT } : t))
        )
        nextFinalQuestion()
      }
    },
    [finalActiveTeam, finalRunning, nextFinalQuestion]
  )

  useEffect(() => {
    if (!finalRunning) return
    if (finalSecondsLeft <= 0) return
    const interval = setInterval(() => {
      setFinalSecondsLeft((s) => clampInt(s - 1, 0, FINAL_SECONDS))
    }, 1000)
    return () => clearInterval(interval)
  }, [finalRunning, finalSecondsLeft])

  useEffect(() => {
    if (!finalRunning) return
    if (finalSecondsLeft <= 0) {
      setFinalRunning(false)
      setShowingAnswer(false)
      return
    }
    if (finalSecondsLeft <= 10) {
      beep()
    }
  }, [beep, finalRunning, finalSecondsLeft])

  useEffect(() => {
    if (!finalRunning) return
    if (finalAskedCount >= FINAL_MAX_QUESTIONS) {
      setFinalRunning(false)
      setShowingAnswer(false)
    }
  }, [finalAskedCount, finalRunning])

  // First page: landing with logo
  if (phase === 'landing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-x-hidden px-4">
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]" aria-hidden>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 30L30 60L0 30Z' fill='none' stroke='%23c3b091' stroke-width='0.5'/%3E%3C/svg%3E")`,
            }}
          />
        </div>
        <img
          src={LOGO_URL}
          alt="British International Schools in Kurdistan"
          className="relative z-10 w-40 sm:w-52 md:w-64 h-auto object-contain mb-8 drop-shadow-md"
        />
        <h1 className="font-heading relative z-10 m-0 mb-3 text-3xl sm:text-4xl md:text-5xl font-bold text-islamic-heading tracking-tight text-center">
          Islamic Quiz Contest
        </h1>
        <p className="font-sans relative z-10 m-0 mb-10 text-base sm:text-lg text-islamic-muted text-center max-w-md">
          Round 1 (Board) → Round 2 (Hints) → Final (Speed Round)
        </p>
        <button
          type="button"
          onClick={() => setPhase('setup')}
          className="relative z-10 py-3 px-8 rounded-xl font-semibold text-islamic-card bg-islamic-accent hover:bg-islamic-accent/90 active:scale-[0.99] transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-islamic-accent"
        >
          Start setup
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center relative overflow-x-hidden">
      {/* Corner logo */}
      <button
        type="button"
        onClick={() => setPhase('landing')}
        className="absolute top-3 left-3 z-20 w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-transparent hover:opacity-90 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-islamic-accent p-0"
        aria-label="British International Schools in Kurdistan — back to start"
      >
        <img
          src={LOGO_URL}
          alt=""
          className="w-full h-full object-contain"
        />
      </button>

      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 30L30 60L0 30Z' fill='none' stroke='%23c3b091' stroke-width='0.5'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <header className="relative z-10 text-center pt-8 pb-6 px-4">
        <h1 className="font-heading m-0 mb-2 text-3xl sm:text-4xl md:text-5xl font-bold text-islamic-heading tracking-tight drop-shadow-sm">
          Islamic Quiz Contest
        </h1>
        <p className="font-sans m-0 text-base sm:text-lg text-islamic-muted max-w-md mx-auto">
          {phase === 'setup'
            ? 'Set team names and Round 1 target.'
            : phase === 'round1'
              ? 'Round 1: choose a team, then choose a number.'
              : phase === 'round2'
                ? 'Round 2: reveal hints one by one and guess the Prophet.'
                : phase === 'tiebreak'
                  ? 'Scores are tied. Choose one team to eliminate from the final.'
                  : phase === 'final'
                    ? 'Final: 60 seconds — answer up to 12 questions.'
                    : 'Results'}
        </p>
        <div className="flex flex-col items-center gap-3 mt-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full max-w-4xl">
            {teams.map((t, idx) => (
              <div
                key={t.id}
                className={`rounded-2xl border-2 px-4 py-3 text-left text-islamic-text-on-light ${
                  (phase === 'final' || phase === 'done'
                    ? qualifiers[finalTurnIdx]?.id === t.id
                    : idx === activeTeamIdx)
                    ? 'border-islamic-accent bg-islamic-card/90'
                    : 'border-islamic-cell-border bg-islamic-card/60'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{t.name}</div>
                    <div className="mt-1 text-xs text-islamic-text-on-light/70">
                      R1: {t.r1Answered}/{round1Target} • R2: {t.r2Answered}/2
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="inline-flex items-center gap-2 rounded-xl bg-islamic-accent px-3 py-1.5 shadow-sm border border-black/10">
                      <span className="text-[11px] font-semibold text-islamic-bg/90">Points</span>
                      <span className="text-xl font-extrabold text-islamic-bg leading-none tabular-nums min-w-[2.5rem] text-center">
                        {t.score}
                      </span>
                    </div>
                    {phase === 'final' || phase === 'done'
                      ? finalQualifiedIds && !finalQualifiedIds.includes(t.id)
                        ? (
                          <span className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-black/25 text-islamic-heading/90">
                            Eliminated
                          </span>
                          )
                        : qualifiers[finalTurnIdx]?.id === t.id
                          ? (
                            <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold bg-islamic-cell text-white shadow-md border border-islamic-cell-border">
                              <span className="text-base">✓</span>
                              Final turn
                            </span>
                            )
                          : (
                            <button
                              type="button"
                              onClick={() => {
                                const qi = qualifiers.findIndex((q) => q.id === t.id)
                                if (qi === 0 || qi === 1) setFinalTurnIdx(qi as 0 | 1)
                              }}
                              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold bg-islamic-accent text-islamic-bg border-2 border-islamic-khaki-dark/50 shadow-md hover:brightness-110 active:scale-[0.98] transition-all"
                            >
                              <span className="text-base">●</span>
                              Make active
                            </button>
                            )
                      : idx === activeTeamIdx
                        ? (
                          <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold bg-islamic-cell text-white shadow-md border border-islamic-cell-border">
                            <span className="text-base">✓</span>
                            Selected
                          </span>
                          )
                        : (
                          <button
                            type="button"
                            onClick={() => setActiveTeamIdx(idx)}
                            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold bg-islamic-accent text-islamic-bg border-2 border-islamic-khaki-dark/50 shadow-md hover:brightness-110 active:scale-[0.98] transition-all"
                          >
                            <span className="text-base">●</span>
                            Select team
                          </button>
                          )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={resetAll}
              className="text-sm font-medium text-islamic-muted hover:text-islamic-heading underline underline-offset-2 transition-colors"
            >
              Reset contest
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 w-full flex-1 flex flex-col items-center px-3 sm:px-6 pb-10">
        {phase === 'setup' && (
          <div className="w-full max-w-4xl mx-auto">
            <div className="bg-islamic-card/90 text-islamic-text-on-light border-2 border-islamic-cell-border rounded-2xl p-5 sm:p-6">
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {teams.map((t, idx) => (
                    <label key={t.id} className="block">
                      <span className="block text-sm font-semibold mb-1">Team {idx + 1} name</span>
                      <input
                        value={t.name}
                        onChange={(e) => {
                          const v = e.target.value
                          setTeams((prev) => prev.map((x) => (x.id === t.id ? { ...x, name: v } : x)))
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-white text-black border-2 border-black/15 focus:outline-none focus:ring-2 focus:ring-islamic-accent"
                      />
                    </label>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-semibold">Round 1 questions per team: 8</span>
                  <span className="text-sm text-islamic-text-on-light/75">(each correct = {POINTS_PER_CORRECT} points)</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setPhase('round1')}
                    className="flex-1 py-3 px-5 rounded-xl font-semibold bg-islamic-accent text-islamic-card hover:bg-islamic-accent/90 active:scale-[0.99] transition-all"
                  >
                    Start Round 1
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {phase === 'round1' && (
          <>
            <div className="flex flex-wrap items-center justify-center gap-3 mb-5">
              <span className="text-sm text-islamic-muted/90">
                Used: <span className="font-semibold text-islamic-accent">{usedR1.size}</span> / {round1.length}
              </span>
              <button
                type="button"
                onClick={() => !r1TeamBlocked && setWheelOpen(true)}
                disabled={r1TeamBlocked || usedR1.size >= round1.length}
                className="py-2.5 px-5 rounded-xl font-semibold bg-islamic-accent text-islamic-card hover:bg-islamic-accent/90 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Spin wheel
              </button>
              {r1Done && (
                <button
                  type="button"
                  onClick={() => setPhase('round2')}
                  className="py-2.5 px-5 rounded-xl font-semibold border-2 border-islamic-accent text-islamic-accent bg-transparent hover:bg-islamic-accent/10 transition-all"
                >
                  Go to Round 2
                </button>
              )}
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-7 lg:grid-cols-10 gap-1.5 sm:gap-2 w-full max-w-4xl mx-auto">
              {round1.map(({ id }) => {
                const used = usedR1.has(id)
                const blocked = r1TeamBlocked
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={used || blocked}
                    className={`
                      aspect-square min-w-0 text-sm sm:text-base lg:text-lg font-bold rounded-xl
                      flex items-center justify-center transition-all duration-200
                      focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-islamic-accent
                      ${used
                        ? 'bg-islamic-cell/50 border-2 border-islamic-cell-border/50 text-islamic-muted/70 cursor-default line-through'
                        : blocked
                          ? 'bg-islamic-cell/40 border-2 border-islamic-cell-border/40 text-islamic-muted/70 cursor-not-allowed'
                          : 'bg-islamic-cell border-2 border-islamic-cell-border text-islamic-heading cursor-pointer hover:scale-105 hover:shadow-xl hover:bg-islamic-cell-hover hover:border-islamic-accent active:scale-[0.98]'
                      }
                    `}
                    onClick={() => !used && !blocked && setSelectedNumber(id)}
                    aria-label={used ? `Question ${id} (already used)` : `Question ${id}`}
                    aria-pressed={selectedNumber === id}
                  >
                    {id}
                  </button>
                )
              })}
            </div>

            {r1TeamBlocked && (
              <p className="mt-5 text-sm text-islamic-muted">Selected team already answered {round1Target} questions in Round 1.</p>
            )}
          </>
        )}

        {phase === 'round2' && (
          <div className="w-full max-w-4xl mx-auto">
            <div className="bg-islamic-card/90 text-islamic-text-on-light border-2 border-islamic-cell-border rounded-2xl p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-islamic-text-on-light/75">
                  Used: <span className="font-semibold text-islamic-accent">{usedR2.size}</span> / {round2.length}
                </div>
                <div className="flex items-center gap-3">
                  {r2Done && (
                    <button
                      type="button"
                      onClick={() => {
                        if (hasTieForFinal(teams)) {
                          setTiebreakEliminatedId(null)
                          setPhase('tiebreak')
                        } else {
                          const topTwo = getTopTwoTeams(teams).slice(0, 2).map((t) => t.id)
                          setFinalQualifiedIds(topTwo)
                          setPhase('final')
                        }
                      }}
                      className="py-2.5 px-5 rounded-xl font-semibold border-2 border-islamic-accent text-islamic-accent bg-transparent hover:bg-islamic-accent/10 transition-all"
                    >
                      Go to Final (Top 2)
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {teams.map((t, idx) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => startNextR2ForTeam(idx)}
                    disabled={t.r2Answered >= 2}
                    className={`rounded-2xl border-2 px-4 py-4 text-left transition-all ${
                      idx === activeTeamIdx
                        ? 'border-islamic-accent bg-islamic-accent/10'
                        : 'border-islamic-cell-border bg-transparent hover:bg-black/5'
                    } ${t.r2Answered >= 2 ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-sm text-islamic-text-on-light/75 mt-1">
                      Round 2: {t.r2Answered}/2
                    </div>
                    <div className="text-sm text-islamic-text-on-light/75 mt-3">Start next hints question</div>
                  </button>
                ))}
              </div>

              {r2Selected && (
                <div className="mt-6 rounded-2xl border-2 border-islamic-cell-border bg-white/80 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-black/75">Round 2 • Team: {activeTeam?.name}</div>
                      <div className="text-lg font-bold text-black/90 mt-1">Who is he?</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setR2SelectedId(null)
                        setR2HintStep(0)
                        setShowingAnswer(false)
                      }}
                      className="px-3 py-2 rounded-xl bg-black/10 text-black/70 hover:bg-black/15 transition-colors"
                    >
                      Close
                    </button>
                  </div>

                  <div className="mt-4 space-y-2">
                    {r2Selected.hints.slice(0, r2HintStep + 1).map((h, i) => (
                      <div key={i} className="text-base text-black/90">
                        <span className="font-semibold">Hint {i + 1}:</span> {h}
                      </div>
                    ))}
                  </div>

                  {showingAnswer && (
                    <div className="mt-4 text-xl font-bold text-islamic-accent">Answer: {r2Selected.answer}</div>
                  )}

                  <div className="mt-5 flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => setR2HintStep((s) => clampInt(s + 1, 0, 3))}
                      disabled={r2HintStep >= 3}
                      className="flex-1 py-3 px-5 rounded-xl font-semibold border-2 border-islamic-accent text-islamic-accent bg-transparent hover:bg-islamic-accent/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      Next hint
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowingAnswer(true)}
                      className="flex-1 py-3 px-5 rounded-xl font-semibold bg-islamic-accent text-islamic-card hover:bg-islamic-accent/90 active:scale-[0.99] transition-all"
                    >
                      Reveal answer
                    </button>
                  </div>

                  <div className="mt-3 flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => markR2Answer(true)}
                      className="flex-1 py-3 px-5 rounded-xl font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-all"
                    >
                      Correct (+{POINTS_PER_CORRECT})
                    </button>
                    <button
                      type="button"
                      onClick={() => markR2Answer(false)}
                      className="flex-1 py-3 px-5 rounded-xl font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-all"
                    >
                      Wrong (0)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {phase === 'tiebreak' && (
          <div className="w-full max-w-4xl mx-auto">
            <div className="bg-islamic-card/90 text-islamic-text-on-light border-2 border-islamic-cell-border rounded-2xl p-5 sm:p-6">
              <p className="text-base font-semibold text-islamic-text-on-light mb-1">
                Scores are tied. Choose which team to eliminate from the final round.
              </p>
              <p className="text-sm text-islamic-text-on-light/75 mb-6">
                The other two teams will go through to the speed round.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                {teams.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTiebreakEliminatedId((id) => (id === t.id ? null : t.id))}
                    className={`rounded-2xl border-2 px-4 py-4 text-left transition-all ${
                      tiebreakEliminatedId === t.id
                        ? 'border-rose-500 bg-rose-500/20 ring-2 ring-rose-400'
                        : 'border-islamic-cell-border bg-white/80 hover:border-islamic-accent/50 hover:bg-islamic-accent/5'
                    }`}
                  >
                    <div className="font-bold text-islamic-text-on-light">{t.name}</div>
                    <div className="text-sm text-islamic-text-on-light/75 mt-1">
                      Score: <span className="font-semibold text-islamic-accent">{t.score}</span>
                    </div>
                    <div className="mt-3 text-sm font-semibold">
                      {tiebreakEliminatedId === t.id ? '✓ Eliminated (click to undo)' : 'Click to eliminate'}
                    </div>
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={!tiebreakEliminatedId}
                onClick={() => {
                  if (!tiebreakEliminatedId) return
                  const qualified = teams.filter((t) => t.id !== tiebreakEliminatedId).map((t) => t.id)
                  setFinalQualifiedIds(qualified)
                  setTiebreakEliminatedId(null)
                  setPhase('final')
                }}
                className="w-full sm:w-auto py-3 px-6 rounded-xl font-bold bg-islamic-accent text-islamic-bg border-2 border-islamic-khaki-dark/50 shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition-all"
              >
                Confirm: these 2 go to final
              </button>
            </div>
          </div>
        )}

        {phase === 'final' && (
          <div className="w-full max-w-4xl mx-auto">
            <div className="bg-islamic-card/90 text-islamic-text-on-light border-2 border-islamic-cell-border rounded-2xl p-5 sm:p-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-islamic-text-on-light/75">Qualified teams (Top 2 after Rounds 1 & 2)</div>
                    <div className="text-lg font-bold mt-1">
                      {qualifiers[0]?.name} vs {qualifiers[1]?.name}
                    </div>
                    {eliminatedTeams.length > 0 && (
                      <div className="mt-1 text-xs text-islamic-text-on-light/70">
                        Eliminated: {eliminatedTeams.map((t) => t.name).join(', ')}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPhase('done')}
                    className="py-2.5 px-5 rounded-xl font-semibold border-2 border-islamic-accent text-islamic-accent bg-transparent hover:bg-islamic-accent/10 transition-all"
                  >
                    Finish & show results
                  </button>
                </div>

                <div className="rounded-2xl border-2 border-islamic-cell-border bg-white/80 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-black/75">Speed round turn</div>
                      <div className="text-2xl font-bold text-black/90 mt-1">{finalActiveTeam?.name ?? '(No team)'}</div>
                      <div className="text-sm text-black/75 mt-2">
                        Time: <span className="font-semibold text-islamic-accent">{finalSecondsLeft}s</span> • Questions: {finalAskedCount}/{FINAL_MAX_QUESTIONS}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setFinalTurnIdx((i) => (i === 0 ? 1 : 0))}
                        disabled={finalRunning}
                        className="px-3 py-2 rounded-xl border-2 border-islamic-accent text-islamic-accent bg-transparent hover:bg-islamic-accent/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        Switch team
                      </button>
                      <button
                        type="button"
                        onClick={startFinalTurn}
                        disabled={finalRunning || !finalActiveTeam}
                        className="px-4 py-2.5 rounded-xl font-semibold bg-islamic-accent text-islamic-card hover:bg-islamic-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {finalRunning ? 'Running…' : 'Start 60s'}
                      </button>
                    </div>
                  </div>

                  {finalCurrentQuestion && (
                    <div className="mt-5">
                      <div className="text-sm font-semibold text-black/75 mb-2">Question</div>
                      <div className="text-xl font-semibold text-black/90">{finalCurrentQuestion.question}</div>

                      {showingAnswer && (
                        <div className="mt-3 text-xl font-bold text-islamic-accent">Answer: {finalCurrentQuestion.answer}</div>
                      )}

                      <div className="mt-5 flex flex-col sm:flex-row gap-3">
                        <button
                          type="button"
                          onClick={() => setShowingAnswer(true)}
                          disabled={!finalRunning}
                          className="flex-1 py-3 px-5 rounded-xl font-semibold border-2 border-islamic-accent text-islamic-accent bg-transparent hover:bg-islamic-accent/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          Reveal answer
                        </button>
                        <button
                          type="button"
                          onClick={() => markFinalAnswer(true)}
                          disabled={!finalRunning}
                          className="flex-1 py-3 px-5 rounded-xl font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          Correct (+{POINTS_PER_CORRECT})
                        </button>
                        <button
                          type="button"
                          onClick={nextFinalQuestion}
                          disabled={!finalRunning}
                          className="flex-1 py-3 px-5 rounded-xl font-semibold bg-black/15 text-black/80 hover:bg-black/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          Next question
                        </button>
                      </div>

                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setFinalRunning(false)
                            setShowingAnswer(false)
                          }}
                          className="text-sm font-medium text-islamic-muted hover:text-islamic-heading underline underline-offset-2 transition-colors"
                        >
                          Stop timer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div className="w-full max-w-4xl mx-auto">
            <div className="bg-islamic-card/90 text-islamic-text-on-light border-2 border-islamic-cell-border rounded-2xl p-6">
              <div className="text-sm text-islamic-text-on-light/75">Final scores</div>
              <div className="mt-2 space-y-2">
                {[...teams].sort((a, b) => b.score - a.score).map((t, idx) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 bg-white/90 rounded-xl p-4">
                    <div className="font-semibold text-black/90">
                      {idx + 1}. {t.name}
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-xl bg-islamic-accent px-4 py-2 shadow-sm border border-black/10">
                      <span className="text-[11px] font-semibold text-islamic-bg/90">Points</span>
                      <span className="text-2xl font-extrabold text-islamic-bg leading-none tabular-nums min-w-[3rem] text-center">
                        {t.score}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setPhase('setup')}
                  className="flex-1 py-3 px-5 rounded-xl font-semibold bg-islamic-accent text-islamic-card hover:bg-islamic-accent/90 transition-all"
                >
                  New contest
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {phase === 'round1' && wheelOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-black/70 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Spinning wheel"
          onClick={() => setWheelOpen(false)}
        >
          <button
            type="button"
            onClick={() => setWheelOpen(false)}
            className="fixed top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 rounded-full bg-black/40 text-islamic-heading hover:bg-islamic-accent/40 flex items-center justify-center text-xl z-[101] transition-colors"
            aria-label="Close wheel"
          >
            ✕
          </button>
          <div
            className="flex flex-col items-center gap-6 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <SpinningWheel
              total={round1.length}
              usedNumbers={usedR1}
              onSpinComplete={(n) => {
                setWheelOpen(false)
                if (!r1TeamBlocked) setSelectedNumber(n)
              }}
              large
            />
          </div>
        </div>
      )}

      {phase === 'round1' && selectedR1Question && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="question-title"
          onClick={closeModal}
        >
          <div
            className="relative bg-islamic-card text-islamic-text-on-light rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-xl animate-slide-up overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decorative top border: khaki + gold */}
            <div className="h-1 sm:h-1.5 bg-gradient-to-r from-islamic-khaki-dark/80 via-islamic-accent to-islamic-khaki-dark/80" />

            <div className="p-6 sm:p-8" dir="ltr">
              <div className="flex items-center justify-between gap-4 mb-4">
                <span className="font-heading text-islamic-accent font-bold text-lg sm:text-xl">
                  {showingAnswer ? 'Correct answer' : `Round 1 • Question ${selectedR1Question.id}`}
                </span>
                <button
                  ref={closeButtonRef}
                  type="button"
                  className="w-10 h-10 rounded-xl bg-black/10 text-islamic-text-on-light/70 hover:bg-islamic-accent/20 hover:text-islamic-accent flex items-center justify-center text-xl transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-islamic-accent"
                  onClick={closeModal}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              {showingAnswer ? (
                <>
                  <p className="font-sans m-0 mb-4 text-xl sm:text-2xl leading-relaxed font-semibold text-islamic-text-on-light">
                    {selectedR1Question.answer || '(No answer provided)'}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      className="flex-1 py-3 px-5 rounded-xl font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-all"
                      onClick={() => markR1Answer(true)}
                    >
                      Correct (+{POINTS_PER_CORRECT})
                    </button>
                    <button
                      type="button"
                      className="flex-1 py-3 px-5 rounded-xl font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-all"
                      onClick={() => markR1Answer(false)}
                    >
                      Wrong (0)
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h2
                    id="question-title"
                    className="font-sans m-0 mb-8 text-xl sm:text-2xl leading-relaxed font-semibold text-islamic-text-on-light"
                  >
                    {selectedR1Question.question || '(No question for this number)'}
                  </h2>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      className="flex-1 order-2 sm:order-1 py-3 px-5 rounded-xl font-semibold bg-islamic-accent text-islamic-card hover:bg-islamic-accent/90 active:scale-[0.99] transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-islamic-accent"
                      onClick={() => setShowingAnswer(true)}
                    >
                      Reveal answer
                    </button>
                    <button
                      type="button"
                      className="flex-1 order-1 sm:order-2 py-3 px-5 rounded-xl font-semibold border-2 border-islamic-accent text-islamic-accent bg-transparent hover:bg-islamic-accent/10 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-islamic-accent"
                      onClick={closeModal}
                    >
                      Back (keep for later)
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
