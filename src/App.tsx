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

const LOGO_URL = 'https://bisk.edu.krd/wp-content/uploads/elementor/thumbs/cropped-BISK-BADGE-1-qqobsotbetcmcnpcklkbc1oqzcj08mperrvsjr036o.png'
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
        <div className="flex flex-col items-center gap-4 mt-6 w-full max-w-4xl mx-auto px-1">
          <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full">
            {teams.map((t, idx) => {
              const isActive =
                phase === 'final' || phase === 'done'
                  ? qualifiers[finalTurnIdx]?.id === t.id
                  : idx === activeTeamIdx
              const isEliminated = (phase === 'final' || phase === 'done') && finalQualifiedIds && !finalQualifiedIds.includes(t.id)
              const canSelect =
                !isEliminated &&
                (phase === 'final' || phase === 'done'
                  ? qualifiers.some((q) => q.id === t.id) && !isActive
                  : !isActive)

              const content = (
                <>
                  <div className="min-w-0 text-center sm:text-left">
                    <div className="font-bold text-base sm:text-lg truncate text-islamic-text-on-light">{t.name}</div>
                    <div className="mt-0.5 text-[10px] sm:text-xs text-islamic-text-on-light/60">
                      R1 {t.r1Answered}/{round1Target} · R2 {t.r2Answered}/2
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold tabular-nums text-islamic-accent mt-1 sm:mt-0">
                    {t.score}
                  </div>
                  {isActive && (
                    <div className="col-span-full text-[10px] sm:text-xs font-semibold text-islamic-accent uppercase tracking-wide mt-1">
                      {phase === 'final' || phase === 'done' ? 'Playing now' : 'Selected'}
                    </div>
                  )}
                  {isEliminated && (
                    <div className="col-span-full text-[10px] sm:text-xs text-islamic-text-on-light/50 mt-1">
                      Out
                    </div>
                  )}
                  {canSelect && (
                    <div className="col-span-full text-[10px] sm:text-xs text-islamic-text-on-light/60 mt-1">
                      Tap to select
                    </div>
                  )}
                </>
              )

              const sharedClasses = `rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col items-center sm:items-start transition-all duration-200 ${
                isEliminated
                  ? 'opacity-60 bg-islamic-card/50 border border-islamic-cell-border/50'
                  : isActive
                    ? 'bg-islamic-card border-2 border-islamic-accent'
                    : 'bg-islamic-card/90 border border-islamic-cell-border hover:border-islamic-accent/70 hover:bg-islamic-card'
              }`

              if (canSelect) {
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      if (phase === 'final' || phase === 'done') {
                        const qi = qualifiers.findIndex((q) => q.id === t.id)
                        if (qi === 0 || qi === 1) setFinalTurnIdx(qi as 0 | 1)
                      } else {
                        setActiveTeamIdx(idx)
                      }
                    }}
                    className={`${sharedClasses} cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-islamic-accent text-left w-full`}
                  >
                    {content}
                  </button>
                )
              }
              return (
                <div key={t.id} className={`${sharedClasses} cursor-default`}>
                  {content}
                </div>
              )
            })}
          </div>

          <button
            type="button"
            onClick={resetAll}
            className="text-sm text-islamic-muted hover:text-islamic-heading underline underline-offset-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-islamic-accent rounded"
          >
            Reset contest
          </button>
        </div>
      </header>

      <main className="relative z-10 w-full flex-1 flex flex-col items-center px-3 sm:px-6 pb-10">
        {phase === 'setup' && (
          <div className="w-full max-w-4xl mx-auto">
            <div className="bg-islamic-card text-islamic-text-on-light border-2 border-islamic-cell-border rounded-3xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-islamic-cell/80 to-islamic-cell-border/60 px-5 sm:px-8 py-4 border-b border-islamic-cell-border">
                <h2 className="font-heading m-0 text-xl sm:text-2xl font-bold text-islamic-heading">
                  Name your teams
                </h2>
                <p className="font-sans m-0 mt-1 text-sm text-islamic-heading/80">
                  Enter a name for each team, then start the contest.
                </p>
              </div>
              <div className="p-5 sm:p-8 flex flex-col gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
                  {teams.map((t, idx) => (
                    <label
                      key={t.id}
                      className="block rounded-2xl border-2 border-islamic-cell-border bg-white/60 p-4 sm:p-5 hover:border-islamic-accent/50 hover:bg-white/80 transition-all focus-within:ring-2 focus-within:ring-islamic-accent focus-within:border-islamic-accent"
                    >
                      <span className="flex items-center gap-2 text-sm font-bold text-islamic-text-on-light mb-2">
                        <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-islamic-accent text-islamic-bg text-sm font-extrabold">
                          {idx + 1}
                        </span>
                        Team {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={t.name}
                        onChange={(e) => {
                          const v = e.target.value
                          setTeams((prev) => prev.map((x) => (x.id === t.id ? { ...x, name: v } : x)))
                        }}
                        placeholder={`e.g. Team ${idx + 1}`}
                        className="w-full px-4 py-3 rounded-xl bg-white text-black border-2 border-black/10 focus:outline-none focus:ring-2 focus:ring-islamic-accent focus:border-islamic-accent placeholder:text-black/40 font-medium"
                      />
                    </label>
                  ))}
                </div>

                <div className="rounded-xl bg-islamic-cell/20 border border-islamic-cell-border/50 px-4 py-3 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-islamic-text-on-light">Round 1:</span>
                  <span className="text-sm text-islamic-text-on-light/90">8 questions per team</span>
                  <span className="text-islamic-text-on-light/60">•</span>
                  <span className="text-sm text-islamic-text-on-light/90">{POINTS_PER_CORRECT} points per correct answer</span>
                </div>

                <button
                  type="button"
                  onClick={() => setPhase('round1')}
                  className="w-full py-4 px-6 rounded-2xl font-bold text-lg bg-islamic-accent text-islamic-bg border-2 border-islamic-khaki-dark/40 shadow-lg hover:brightness-110 active:scale-[0.99] transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-islamic-accent"
                >
                  Start Round 1
                </button>
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
                  className="py-2 px-4 rounded-lg text-sm font-medium text-islamic-accent border border-islamic-accent/60 bg-islamic-accent/5 hover:bg-islamic-accent/10 hover:border-islamic-accent/80 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-islamic-accent"
                >
                  Go to Round 2 →
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
            <div className="bg-islamic-card/95 text-islamic-text-on-light border border-islamic-cell-border/80 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-islamic-cell-border/50 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-islamic-text-on-light/70">
                  Hints used <span className="font-semibold text-islamic-text-on-light">{usedR2.size}</span>/<span className="text-islamic-text-on-light/80">{round2.length}</span>
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
                      className="py-2 px-4 rounded-lg text-sm font-medium text-islamic-accent border border-islamic-accent/60 bg-islamic-accent/5 hover:bg-islamic-accent/10 hover:border-islamic-accent/80 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-islamic-accent"
                    >
                      Go to Final (Top 2) →
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 sm:p-6">
                <p className="text-xs sm:text-sm text-islamic-text-on-light/60 mb-4">Pick a team to start their hints question (2 per team).</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {teams.map((t, idx) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => startNextR2ForTeam(idx)}
                      disabled={t.r2Answered >= 2}
                      className={`rounded-xl border px-4 py-4 text-left transition-all ${
                        idx === activeTeamIdx
                          ? 'border-islamic-accent bg-islamic-accent/10 text-islamic-text-on-light'
                          : 'border-islamic-cell-border/70 bg-white/50 hover:bg-white/80 hover:border-islamic-accent/50'
                      } ${t.r2Answered >= 2 ? 'opacity-55 cursor-not-allowed' : ''}`}
                    >
                      <div className="font-semibold text-islamic-text-on-light">{t.name}</div>
                      <div className="text-xs text-islamic-text-on-light/60 mt-1">
                        {t.r2Answered}/2 questions
                      </div>
                      {t.r2Answered < 2 && (
                        <div className="text-xs text-islamic-accent mt-2 font-medium">Start hints →</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {r2Selected && (
                <div className="mx-4 sm:mx-6 mb-6 rounded-xl border border-islamic-cell-border/70 bg-white/90 p-4 sm:p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-islamic-text-on-light/60">Team: {activeTeam?.name}</div>
                      <div className="text-lg font-semibold text-islamic-text-on-light mt-0.5">Who is he?</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setR2SelectedId(null)
                        setR2HintStep(0)
                        setShowingAnswer(false)
                      }}
                      className="shrink-0 p-2 rounded-lg text-islamic-text-on-light/70 hover:bg-black/5 hover:text-islamic-text-on-light transition-colors"
                      aria-label="Close"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="mt-4 space-y-2.5">
                    {r2Selected.hints.slice(0, r2HintStep + 1).map((h, i) => (
                      <div key={i} className="text-sm text-islamic-text-on-light/90 pl-1">
                        <span className="font-medium text-islamic-text-on-light/70">Hint {i + 1}</span>
                        <span className="ml-2">{h}</span>
                      </div>
                    ))}
                  </div>

                  {showingAnswer && (
                    <div className="mt-4 pt-4 border-t border-islamic-cell-border/50 text-base font-semibold text-islamic-accent">
                      Answer: {r2Selected.answer}
                    </div>
                  )}

                  <div className="mt-5 flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => setR2HintStep((s) => clampInt(s + 1, 0, 3))}
                      disabled={r2HintStep >= 3}
                      className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium border border-islamic-accent/60 text-islamic-accent bg-islamic-accent/5 hover:bg-islamic-accent/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next hint
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowingAnswer(true)}
                      className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium bg-islamic-accent/90 text-islamic-bg hover:bg-islamic-accent transition-colors"
                    >
                      Reveal answer
                    </button>
                  </div>

                  <div className="mt-3 flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => markR2Answer(true)}
                      className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium bg-emerald-500/90 text-white hover:bg-emerald-600 transition-colors"
                    >
                      Correct (+{POINTS_PER_CORRECT})
                    </button>
                    <button
                      type="button"
                      onClick={() => markR2Answer(false)}
                      className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium bg-rose-500/90 text-white hover:bg-rose-600 transition-colors"
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
            <div className="bg-islamic-card/95 text-islamic-text-on-light border border-islamic-cell-border/80 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-islamic-cell-border/50">
                <h2 className="font-heading m-0 text-lg sm:text-xl font-bold text-islamic-text-on-light">
                  Scores are tied
                </h2>
                <p className="text-sm text-islamic-text-on-light/70 mt-1">
                  Tap one team to eliminate. The other two will go to the final.
                </p>
              </div>
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                  {teams.map((t) => {
                    const isEliminated = tiebreakEliminatedId === t.id
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTiebreakEliminatedId((id) => (id === t.id ? null : t.id))}
                        className={`rounded-xl border px-4 py-4 text-left transition-all ${
                          isEliminated
                            ? 'border-rose-400/70 bg-rose-50/80 text-islamic-text-on-light'
                            : 'border-islamic-cell-border/70 bg-white/60 hover:bg-white/90 hover:border-islamic-accent/50'
                        } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-islamic-accent`}
                      >
                        <div className="font-semibold text-islamic-text-on-light">{t.name}</div>
                        <div className="text-sm text-islamic-text-on-light/60 mt-1">
                          <span className="font-medium text-islamic-accent">{t.score}</span> pts
                        </div>
                        <div className="mt-3 text-xs font-medium text-islamic-text-on-light/70">
                          {isEliminated ? '✓ Eliminated · tap to undo' : 'Tap to eliminate'}
                        </div>
                      </button>
                    )
                  })}
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
                  className="w-full sm:w-auto py-2.5 px-5 rounded-lg text-sm font-medium text-islamic-accent border border-islamic-accent/60 bg-islamic-accent/5 hover:bg-islamic-accent/10 hover:border-islamic-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-islamic-accent"
                >
                  Confirm & go to final →
                </button>
              </div>
            </div>
          </div>
        )}

        {phase === 'final' && (
          <div className="w-full max-w-4xl mx-auto">
            <div className="bg-islamic-card/95 text-islamic-text-on-light border border-islamic-cell-border/80 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-islamic-cell-border/50 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-islamic-text-on-light/60">Final · Top 2</div>
                  <div className="text-base sm:text-lg font-semibold text-islamic-text-on-light mt-0.5">
                    {qualifiers[0]?.name} vs {qualifiers[1]?.name}
                  </div>
                  {eliminatedTeams.length > 0 && (
                    <div className="text-xs text-islamic-text-on-light/50 mt-0.5">
                      Out: {eliminatedTeams.map((t) => t.name).join(', ')}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setPhase('done')}
                  className="py-2 px-4 rounded-lg text-sm font-medium text-islamic-accent border border-islamic-accent/60 bg-islamic-accent/5 hover:bg-islamic-accent/10 hover:border-islamic-accent/80 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-islamic-accent"
                >
                  Finish & show results →
                </button>
              </div>

              <div className="p-4 sm:p-6">
                <div className="rounded-xl border border-islamic-cell-border/70 bg-white/90 p-4 sm:p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="text-xs text-islamic-text-on-light/60">Speed round</div>
                      <div className="text-xl font-semibold text-islamic-text-on-light mt-0.5">{finalActiveTeam?.name ?? '—'}</div>
                      <div className="text-xs text-islamic-text-on-light/60 mt-1">
                        Questions {finalAskedCount}/{FINAL_MAX_QUESTIONS}
                      </div>
                    </div>
                    <div className="flex flex-col items-center min-w-[5.5rem] py-2 px-3 rounded-xl bg-islamic-cell/80 border border-islamic-cell-border/80">
                      <div className="text-[10px] font-medium text-islamic-heading/70 uppercase tracking-wide">Time</div>
                      <div className="text-4xl sm:text-5xl font-extrabold text-islamic-heading tabular-nums leading-none mt-0.5">
                        {finalSecondsLeft}
                      </div>
                      <div className="text-xs text-islamic-accent font-medium">sec</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={startFinalTurn}
                        disabled={finalRunning || !finalActiveTeam}
                        className="py-2 px-4 rounded-lg text-sm font-medium bg-islamic-accent text-islamic-bg hover:bg-islamic-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {finalRunning ? 'Running…' : 'Start 60s'}
                      </button>
                    </div>
                  </div>

                  {finalCurrentQuestion && (
                    <div className="mt-5 pt-5 border-t border-islamic-cell-border/50">
                      <div className="text-xs text-islamic-text-on-light/60 mb-1">Question</div>
                      <div className="text-base sm:text-lg font-semibold text-islamic-text-on-light">{finalCurrentQuestion.question}</div>

                      {showingAnswer && (
                        <div className="mt-3 text-base font-semibold text-islamic-accent">Answer: {finalCurrentQuestion.answer}</div>
                      )}

                      <div className="mt-4 flex flex-col sm:flex-row gap-2">
                        <button
                          type="button"
                          onClick={() => setShowingAnswer(true)}
                          disabled={!finalRunning}
                          className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium border border-islamic-accent/60 text-islamic-accent bg-islamic-accent/5 hover:bg-islamic-accent/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Reveal answer
                        </button>
                        <button
                          type="button"
                          onClick={() => markFinalAnswer(true)}
                          disabled={!finalRunning}
                          className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium bg-emerald-500/90 text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Correct (+{POINTS_PER_CORRECT})
                        </button>
                        <button
                          type="button"
                          onClick={nextFinalQuestion}
                          disabled={!finalRunning}
                          className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium bg-white border border-islamic-cell-border/70 text-islamic-text-on-light hover:bg-black/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Next question
                        </button>
                      </div>

                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setFinalRunning(false)
                            setShowingAnswer(false)
                          }}
                          className="text-xs font-medium text-islamic-text-on-light/60 hover:text-islamic-text-on-light underline underline-offset-1 transition-colors"
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
