# CIPHERX — Interactive Tech Treasure Hunt Platform

> **UX Club Annual Cybersecurity & Tech Treasure Hunt**  
> A mission-control platform designed for university-scale tech treasure hunts, combining real-time operative tracking, server-side puzzle validation, QR code checkpoint gating, and an auditorium control room.

![CIPHERX Platform](https://img.shields.io/badge/Platform-CIPHERX_v2.0-00ff41?style=for-the-badge&logo=gnubash&logoColor=black)
![Next.js](https://img.shields.io/badge/Next.js_16-black?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript_5-007acc?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS_v4-38bdf8?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase_PostgreSQL-3ecf8e?style=for-the-badge&logo=supabase&logoColor=white)

---

## ⚡ Features

### 1. Cyberpunk / Hacker Aesthetic
- Terminal CRT boot sequence with live typing logs.
- Dark theme palette (`#0a0a0f`) with `#00ff41` neon green, `#00bfff` electric blue, and `#8b5cf6` purple accents.
- Monospace JetBrains Mono fonts, scanlines, and HUD telemetry indicators.
- Fully responsive for mobile, tablet, and widescreen projection displays.

### 2. Organiser Command Center (`/organiser/*`)
- **Mission Dashboard**: Live KPI tracker (active squads, total operatives, sector progress, elapsed mission time) with emergency pause/start/end/reset controls.
- **Checkpoint Sector Management**: Create and sequence checkpoints, toggle activation, preview QR tokens, and download QR codes for physical printing.
- **20+ Puzzle Architectures**:
  - Binary decoding
  - Morse code
  - Caesar cipher
  - QR code puzzles
  - Debugging code
  - Logic & reasoning
  - Image clues
  - Audio clues
  - Pattern recognition
  - Password challenges
  - Human Server
  - Human Sorting Algorithm
  - Black Box Machine
  - Beat the Bot
  - Back-to-Back Defuse
  - Hotspot Clue
  - Fake QR Trap
  - Phone-Free Duck Debugging
  - Broken QR Jigsaw
  - Final Vault Finale
- **Auditorium Control Room**: Dedicated theater mode for stage projectors with fullscreen toggle, sector density radar, real-time incoming intercept stream, and breach alerts.
- **Submissions Audit**: Review real-time answer logs with manual approve/reject overrides.
- **Squad Directory**: Full squad registration, operative management, and manual score overrides with reason logging.
- **Event Settings**: Configurable hint penalties, incorrect answer deductions, and hunt master passwords.
- **Final Vault Stage**: Clue combination interface to unlock the final university prize.

### 3. Participant Squad Portal (`/team/*`)
- **Squad Dashboard**: Active mission countdown timer, operative roster, current challenge arena, hint requester with penalty warning, and completed sector log.
- **Anti-Cheat QR Scanner**: In-app camera viewfinder + manual code entry fallback.
  - Server-side anti-skip protection blocks squads from bypassing checkpoints out of order.
  - Duplicate submission blocking prevents replay attacks.
- **Automatic Clue Progression**: Instant sector unlocking upon correct answer submission.

### 4. Public Live Leaderboard (`/leaderboard`)
- Real-time ranking with gold, silver, and bronze badges.
- Search filter by squad name or operative ID.
- Points tally, sector progress, and hint penalty statistics.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router & Turbopack)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) & custom cybersecurity CSS system
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL 17 with Row Level Security)
- **State & Realtime**: Supabase Realtime Channels (`postgres_changes`)
- **QR Engine**: `qrcode.react` & HTML5 Camera Video Stream

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 20+ installed
- A Supabase project (or local PostgreSQL)

### 2. Clone & Install
```bash
git clone https://github.com/NaikAtharva002/CipherX.git
cd CipherX
npm install
```

### 3. Environment Setup
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Build
```bash
npm run build
npm start
```

---

## 🔐 Default Credentials (Demo / Testing)

### Organiser Command
- **Portal**: `/organiser/login`
- **Email**: `admin@cipherx.com`
- **Password**: `UXClub2026!`
- **Staff Signup Invite Code**: `UXCLUB_ADMIN_2026`

### Sample Participant Squads
- **Portal**: `/team/login`
- **Squad 1**: `TEAM001` / `nullptr123` (*Null Pointers*)
- **Squad 2**: `TEAM002` / `stack456` (*Stack Overflow*)
- **Squad 3**: `TEAM003` / `binary789` (*Binary Bandits*)
- **Final Vault Master Key**: `UXCLUB2026`

---

## 🗄️ Database Architecture

The platform uses 11 relational tables managed under Supabase:
- `profiles`: Organiser staff role management
- `event_settings`: Global hunt state (active, paused, ended), duration, and penalty configurations
- `teams`: Registered participant squads with access tokens and credentials
- `team_members`: Operative rosters with roll numbers and contact info
- `checkpoints`: Physical sectors with unique QR tokens and coordinate locations
- `challenges`: Puzzles linked to sectors with answer hashes, hint penalties, and time limits
- `team_progress`: Real-time state machine tracking which team has unlocked/completed which sector
- `submissions`: Complete log of every answer attempt with timestamp, points, and pass/fail state
- `hint_requests`: Requested clues and corresponding time penalty tracking
- `score_adjustments`: Audit trail of all manual points overrides by organizers
- `qr_scans`: Telemetry log of every QR code scan for fraud detection and timing

---

## 📄 License
Created for the UX Club University Tech Treasure Hunt. All rights reserved.
