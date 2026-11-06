'use client'

interface LoadingScreenProps {
  message?: string
}

export default function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div className="relative">
        <div className="spinner" style={{ width: 56, height: 56, borderWidth: 3 }} />
        <div
          className="absolute inset-0 rounded-full"
          style={{
            boxShadow: '0 0 24px rgba(0,255,65,0.4)',
            animation: 'pulse 2s infinite',
          }}
        />
      </div>
      {message && (
        <p className="terminal neon-green text-sm tracking-widest uppercase opacity-80">
          {message}
        </p>
      )}
    </div>
  )
}
