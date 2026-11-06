'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const TERMINAL_LINES = [
  '> Initializing CIPHERX v2.0...',
  '> Loading cipher modules...',
  '> Establishing secure connection...',
  '> Encryption protocols active...',
  '> System ready. Welcome, agent.',
]

export default function HomePage() {
  const [displayedLines, setDisplayedLines] = useState<string[]>([])
  const [currentLine, setCurrentLine] = useState(0)
  const [charIndex, setCharIndex] = useState(0)

  useEffect(() => {
    if (currentLine >= TERMINAL_LINES.length) return

    const line = TERMINAL_LINES[currentLine]
    if (charIndex < line.length) {
      const timer = setTimeout(() => {
        setDisplayedLines(prev => {
          const updated = [...prev]
          if (updated.length <= currentLine) updated.push('')
          updated[currentLine] = line.slice(0, charIndex + 1)
          return updated
        })
        setCharIndex(c => c + 1)
      }, 30)
      return () => clearTimeout(timer)
    } else {
      const timer = setTimeout(() => {
        setCurrentLine(l => l + 1)
        setCharIndex(0)
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [currentLine, charIndex])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-green-500/5 blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-blue-500/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-purple-500/3 blur-3xl" />
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto">
        {/* Logo */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-3 h-3 rounded-full bg-green-400 pulse-green" />
            <span className="terminal text-green-400 text-sm tracking-widest uppercase">System Online</span>
            <div className="w-3 h-3 rounded-full bg-green-400 pulse-green" />
          </div>

          <h1
            className="glitch-text terminal font-black mb-2"
            data-text="CIPHERX"
            style={{
              fontSize: 'clamp(60px, 12vw, 120px)',
              color: '#00ff41',
              textShadow: '0 0 30px rgba(0,255,65,0.8), 0 0 60px rgba(0,255,65,0.4)',
              letterSpacing: '-2px',
            }}
          >
            CIPHERX
          </h1>

          <p className="terminal text-blue-400 tracking-widest text-sm uppercase mb-2">
            UX Club // Tech Treasure Hunt 2026
          </p>
          <p className="text-slate-400 text-base max-w-lg mx-auto">
            Decode the future, one cipher at a time. Are you ready to breach the system?
          </p>
        </div>

        {/* Terminal window */}
        <div className="glow-card rounded-lg p-6 mb-10 text-left max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-green-400/10">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="terminal text-slate-500 text-xs ml-2">cipherx@terminal:~$</span>
          </div>
          <div className="space-y-1 min-h-[120px]">
            {displayedLines.map((line, i) => (
              <p
                key={i}
                className="terminal text-sm"
                style={{ color: i === displayedLines.length - 1 ? '#00ff41' : '#64748b' }}
              >
                {line}
                {i === displayedLines.length - 1 && currentLine < TERMINAL_LINES.length && (
                  <span className="cursor" />
                )}
              </p>
            ))}
            {currentLine >= TERMINAL_LINES.length && (
              <p className="terminal text-green-400 text-sm cursor">_</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/team/login"
            className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 terminal text-sm font-semibold tracking-wider uppercase transition-all duration-300"
            style={{
              border: '1px solid var(--neon-green)',
              color: 'var(--neon-green)',
              background: 'rgba(0, 255, 65, 0.08)',
              boxShadow: '0 0 15px rgba(0, 255, 65, 0.2)',
            }}
          >
            <svg width="18" height="18" className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>ENTER SQUAD PORTAL</span>
          </Link>

          <Link
            href="/leaderboard"
            className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 terminal text-sm font-semibold tracking-wider uppercase transition-all duration-300"
            style={{
              border: '1px solid rgba(0, 191, 255, 0.4)',
              color: '#00bfff',
              background: 'rgba(0, 191, 255, 0.05)',
            }}
          >
            <svg width="18" height="18" className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>LIVE LEADERBOARD</span>
          </Link>

          <Link
            href="/organiser/login"
            className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 terminal text-sm font-semibold tracking-wider uppercase transition-all duration-300"
            style={{
              border: '1px solid rgba(139, 92, 246, 0.4)',
              color: 'var(--purple-accent)',
              background: 'rgba(139, 92, 246, 0.05)',
            }}
          >
            <svg width="18" height="18" className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
            </svg>
            <span>ORGANISER COMMAND</span>
          </Link>
        </div>

        {/* Footer info */}
        <div className="mt-16 flex flex-wrap gap-6 justify-center">
          {[
            { label: 'Challenges', value: '20+' },
            { label: 'Checkpoint Types', value: '10+' },
            { label: 'Real-time', value: 'Live' },
            { label: 'Platform', value: 'CIPHERX' },
          ].map(item => (
            <div key={item.label} className="text-center">
              <div className="terminal font-bold text-xl" style={{ color: '#00ff41' }}>{item.value}</div>
              <div className="text-slate-500 text-xs uppercase tracking-wider mt-1">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
