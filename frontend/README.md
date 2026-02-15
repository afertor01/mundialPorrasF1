# Mundial de Porras F1 — Frontend 🏎️

The **React + TypeScript** frontend for **Mundial de Porras F1**, a Formula 1 prediction league where users predict race results, compete in rankings, form teams, play season-long bingo, and unlock achievements.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Pages](#pages)
  - [Home](#home)
  - [Login / Register](#login--register)
  - [Dashboard](#dashboard)
  - [Predictions](#predictions)
  - [Race Control](#race-control)
  - [Bingo](#bingo)
  - [Profile](#profile)
  - [Team HQ](#team-hq)
  - [Admin](#admin)
- [Components](#components)
- [Services & Utilities](#services--utilities)
- [Styling & Theming](#styling--theming)
- [Project Structure](#project-structure)

---

## Overview

This is the web frontend for the Mundial de Porras F1 platform. It provides a rich, animated UI for all game interactions: submitting race predictions, viewing standings and statistics, managing teams, playing bingo, browsing achievements, and (for admins) managing the entire season lifecycle. The UI is in **Spanish**.

---

## Tech Stack

| Technology | Purpose |
|---|---|
| **React 19** | UI library |
| **TypeScript** | Type-safe JavaScript |
| **Vite** | Build tool and dev server |
| **React Router v7** | Client-side routing with auth guards |
| **Tailwind CSS 3** | Utility-first styling with custom F1 theme |
| **Framer Motion** | Page transitions and UI animations |
| **Axios** | HTTP client with JWT interceptor |
| **Chart.js** / **react-chartjs-2** | Bar charts (Top 20 standings) |
| **Recharts** | Line charts (evolution), radar charts (profile stats) |
| **Lucide React** | Icon library (100+ icons used) |
| **jwt-decode** | Client-side JWT token decoding |
| **clsx** / **tailwind-merge** | Conditional class utilities |
| **ESLint** | Linting with TypeScript and React plugins |
| **PostCSS** / **Autoprefixer** | CSS processing |

---

## Architecture

```
src/
├── api/           → Centralized Axios client (~40 API functions)
├── context/       → React Context (authentication state)
├── pages/         → Route-level page components
├── components/    → Reusable chart and table components
├── utils/         → Helper functions (track image mapping)
└── assets/        → Static assets
```

**Key patterns:**

| Pattern | Details |
|---|---|
| **State management** | React Context for auth + local state per page |
| **Routing** | React Router with `PrivateRoute` guard and admin role check |
| **API layer** | Centralized Axios client with auto-injected JWT Bearer token |
| **Auth flow** | JWT stored in `localStorage`, decoded for role/avatar/user info |
| **Styling** | Tailwind CSS with custom F1 color palette, no CSS-in-JS |
| **Animations** | Framer Motion (`AnimatePresence`, `motion.div`) throughout |

---

## Getting Started

### Prerequisites

- Node.js >= 18
- npm or yarn

### Installation

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install
```

### Development

```bash
# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173` and expects the backend API at `http://127.0.0.1:8000`.

### Build

```bash
# Type-check and build for production
npm run build

# Preview the production build
npm run preview
```

### Lint

```bash
npm run lint
```

---

## Pages

### Home

Landing page with an F1-branded hero section and an animated grid of navigation cards. Shows login/register CTAs for unauthenticated users and a navigation menu for authenticated ones.

### Login / Register

- **Login** — Accepts email or 3-letter acronym + password. Stores JWT on success and redirects to `/dashboard`.
- **Register** — Registration form with email, username, 3-letter acronym (auto-uppercased), and password. Includes a live password validation checklist (8+ chars, uppercase, lowercase, number, special character).

### Dashboard

The main standings and analytics page. Features:
- Switchable between **Drivers** and **Teams** views.
- Three scoring modes: **Total**, **Base**, **Multiplier**.
- Stat cards (position, points, participants, leader).
- Ranking table with position-change indicators.
- Bar chart (Top 20) and historical evolution line chart.
- Highlights the current user's row and team association.

### Predictions

The core gameplay page where users predict race results:
- GP selection grid with track images, status badges (Open/Closed/Completed), and urgency indicators.
- Prediction form: top 10 positions (driver selects) + events (fastest lap, safety car, DNF count, specific DNF driver).
- Auto-closes when race time arrives; read-only mode for past races.
- Qualifying results sidebar shown as reference when available.

### Race Control

Side-by-side comparison of user predictions vs official race results:
- Left panel: user search/selection with add/remove chips.
- Right panel: horizontally scrollable columns — official results + selected user predictions.
- Color-coded position matching (green = exact, yellow = ±1 position).
- Client-side multiplier calculation with breakdown (Safety Car ×1.5, DNFs ×1.5, Fastest Lap ×1.5, Podium exact ×1.5 / partial ×1.25).

### Bingo

Season-long prediction bingo side game:
- Users pick up to **20 tiles** from a board of possible F1 events (e.g., "A Williams gets into Q3").
- Rarity-based scoring: fewer picks on a tile = higher point value.
- Visual states: unselected, selected, completed & selected (jackpot), completed but not selected (missed opportunity).
- Leaderboard tab with Top 20 standings.

### Profile

Rich user profile with three tabs:
- **Stats** — Total points, avg per race, podium ratio, trophy cabinet, radar chart (Regularity, Commitment, Anticipation, Quality, Clairvoyance), momentum streak, hero/villain drivers, best race.
- **Achievements** — Grouped by type (Career/Season/Event), rarity tiers (Common/Rare/Epic/Legendary/Hidden), unlock dates, GP/season context.
- **Settings** (own profile only) — Avatar gallery picker, username/acronym/password change.
- Includes user search to browse other players' profiles.

### Team HQ

Team management for 2-member player teams:
- **No team:** Create a team or join via invite code.
- **Has team:** View members, share join code (clipboard copy), leave team.

### Admin

Full admin panel with 7 tabs:
1. **Seasons** — CRUD for seasons, toggle active/inactive.
2. **Users** — Create/edit/delete users, search, role management, password reset.
3. **Teams** — Create teams, assign free agents, kick members.
4. **GPs & Results** — Import GP calendar (JSON), edit dates, manual race result entry (Top 10 + events), auto-sync from FIA (with terminal-style log modal).
5. **F1 Grid** — Manage constructors and drivers with team colors.
6. **Bingo** — Create/delete tiles, toggle completion status.
7. **Avatars** — Upload/delete avatar images for the gallery.

---

## Components

| Component | Description |
|---|---|
| **BarChartTop20** | Chart.js horizontal bar chart showing Top 20 accumulated points. Highlights the current user's bar in F1 red. Uses acronym labels for drivers, full names for teams. |
| **ComparisonLineChart** | Recharts line chart for points evolution over GPs. Interactive user selector (Top 10 + search), max 10 simultaneous lines. Deterministic color generation from username hash. |
| **EvolutionChart** | Chart.js line chart — alternative evolution view with auto-generated datasets. |
| **RankingTable** | Minimal HTML ranking table component. |

---

## Services & Utilities

### API Client (`api/api.ts`)

Axios-based HTTP client pointing to `http://127.0.0.1:8000` with:
- **JWT interceptor** — Auto-injects Bearer token from `localStorage`.
- **~40 API functions** organized by domain: Auth, Stats, Predictions, Admin (full CRUD), Bingo, Teams, Avatars, Sync (FIA data import).

### Auth Context (`context/AuthContext.tsx`)

React Context providing: `token`, `role`, `avatar`, `username`, `acronym`, `createdAt`.
- `login()` — Stores token in `localStorage`, decodes JWT for role.
- `logout()` — Clears all state.
- `refreshProfile()` — Re-fetches `/auth/me` for live profile updates.

### Track Image Utility (`utils/getTrackImage.ts`)

Maps GP names (multilingual — Spanish/English) to static track layout images in `/public/tracks/`. Covers 24 F1 circuits with a fallback to Bahrain.

---

## Styling & Theming

The app uses a custom **F1-inspired Tailwind theme**:

| Token | Color | Usage |
|---|---|---|
| `f1-red` | `#E10600` | Primary accent, active states, CTAs |
| `f1-dark` | `#15151E` | Dark backgrounds, headers |
| `f1-gray` | — | Secondary text, borders |
| `f1-light` | — | Light backgrounds |

**Font family:** Segoe UI / Roboto.

---

## Project Structure

```
frontend/
├── public/
│   └── tracks/               # Static F1 track layout images
├── src/
│   ├── api/
│   │   └── api.ts            # Axios client & API functions
│   ├── assets/               # Static assets
│   ├── components/
│   │   ├── BarChartTop20.tsx
│   │   ├── ComparisonLineChart.tsx
│   │   ├── EvolutionChart.tsx
│   │   └── RankingTable.tsx
│   ├── context/
│   │   └── AuthContext.tsx    # Authentication context provider
│   ├── pages/
│   │   ├── Admin.tsx
│   │   ├── Bingo.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Home.tsx
│   │   ├── Login.tsx
│   │   ├── Predictions.tsx
│   │   ├── Profile.tsx
│   │   ├── RaceControl.tsx
│   │   ├── Register.tsx
│   │   └── TeamHQ.tsx
│   ├── utils/
│   │   └── getTrackImage.ts  # GP name → track image mapper
│   ├── App.tsx               # Root component, routing, navbar
│   ├── main.tsx              # Entry point
│   └── index.css             # Global styles & Tailwind directives
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── eslint.config.js
```

---

## Authors

**Adrián Fernández** — [afertor01@gmail.com](mailto:afertor01@gmail.com)
**Miguel Ángel González** — [mangelgoca@gmail.com](mailto:mangelgoca@gmail.com)
