# Mundial de Porras F1 🏎️

A **Formula 1 prediction league** backend API where users predict race results, compete in teams, play season-long bingo, and unlock achievements. Built with **FastAPI** and designed to power a React frontend.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Models](#database-models)
- [API Endpoints](#api-endpoints)
  - [Auth](#auth--auth)
  - [Admin](#admin--admin)
  - [Grand Prix](#grand-prix--grand-prix)
  - [Predictions](#predictions--predictions)
  - [Race Results](#race-results--results)
  - [Scoring](#scoring--scoring)
  - [Standings](#standings--standings)
  - [Seasons](#seasons--seasons)
  - [Teams](#teams--teams)
  - [Bingo](#bingo--bingo)
  - [Avatars](#avatars--avatars)
  - [Achievements](#achievements--achievements)
  - [Stats](#stats--stats)
- [Game Mechanics](#game-mechanics)
- [Testing](#testing)

---

## Overview

**Mundial de Porras F1** is a social prediction game for Formula 1 fans. Before each Grand Prix, users predict the top-10 finishing positions and race events (fastest lap, safety cars, etc.). After the race, scores are calculated by comparing predictions against actual results. Players can form 2-person teams, play a season-long bingo game, and earn achievements based on their performance.

---

## Tech Stack

| Technology | Purpose |
|---|---|
| **FastAPI** | Web framework / REST API |
| **SQLModel** / **SQLAlchemy 2.0** | ORM and database modeling |
| **SQLite** | Database (development) |
| **Pydantic v2** | Request/response validation and serialization |
| **Alembic** | Database migrations |
| **python-jose** | JWT token creation and validation |
| **Passlib** + **bcrypt** | Password hashing |
| **FastF1** | Official F1 data library for syncing real race results |
| **Uvicorn** | ASGI server |
| **Pytest** | Testing framework |
| **Poetry** | Dependency management |

**Python version:** >= 3.13

---

## Architecture

The project follows a **layered architecture** pattern:

```
Routers  →  Services  →  Repositories  →  Database
   ↑            ↑
Schemas      Models
(Pydantic)  (SQLModel)
```

- **Routers** — Define HTTP endpoints, handle request parsing and authentication.
- **Services** — Business logic layer (scoring, validation, etc.).
- **Repositories** — Data access layer, direct database queries.
- **Schemas** — Pydantic models for request/response serialization (using camelCase aliases).
- **Models** — SQLModel ORM models defining the database schema.
- **Core** — Security utilities (JWT, password hashing) and dependency injection (auth guards).
- **Utils** — Helper modules for scoring calculations, F1 data sync, and achievement evaluation.

---

## Getting Started

### Prerequisites

- Python >= 3.13
- [Poetry](https://python-poetry.org/) (recommended) or pip

### Installation

```bash
# Clone the repository and navigate to the app directory
cd app

# Install dependencies with Poetry
poetry install

# Or with pip
pip install -r requirements.txt
```

### Running the API

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`.

### API Documentation

- **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **OpenAPI JSON:** [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json)

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `SECRET_KEY` | JWT signing secret | `clave-super-secreta` |

Configure via a `.env` file in the project root.

---

## Database Models

The application uses **18 tables** organized into the following domains:

### Users & Auth
- **`users`** — User accounts with email, username, unique 3-letter acronym, role (`user`/`admin`), and avatar.
- **`avatars`** — Gallery of available avatar images.

### Season & Competition
- **`seasons`** — F1 seasons (only one active at a time).
- **`grand_prix`** — Individual race weekends linked to a season.
- **`constructors`** — F1 teams/constructors per season with team colors.
- **`drivers`** — F1 drivers linked to their constructor.

### Teams (Player Groups)
- **`teams`** — Player teams with auto-generated invite codes.
- **`team_members`** — Team membership (unique user per season).

### Predictions & Results
- **`predictions`** — A user's prediction for a specific GP (with calculated points and multiplier).
- **`prediction_positions`** — Predicted driver finishing positions (top 10).
- **`prediction_events`** — Predicted race events (fastest lap, safety car, etc.).
- **`race_results`** — Actual race results header per GP.
- **`race_positions`** — Actual finishing positions.
- **`race_events`** — Actual race events that occurred.

### Scoring
- **`multiplier_configs`** — Configurable scoring multipliers per event type per season.

### Bingo
- **`bingo_tiles`** — Season-long bingo prediction tiles (e.g., "Alonso gets a podium").
- **`bingo_selections`** — Which tiles each user has selected (max 20).

### Achievements
- **`achievements`** — Achievement definitions (slug, name, description, icon).
- **`user_achievements`** — Records of which achievements each user has unlocked.

---

## API Endpoints

The API exposes **~50 endpoints** across **13 routers**. Authentication is handled via **OAuth2 Bearer tokens** (JWT).

### Auth — `/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Register a new user account |
| `POST` | `/auth/login` | Public | Login and receive a JWT access token |
| `GET` | `/auth/me` | User | Get current user's profile |
| `PATCH` | `/auth/me` | User | Update username, email, acronym, or password |

### Admin — `/admin`

All admin endpoints require the `admin` role.

#### User Management
| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/users` | List all users |
| `POST` | `/admin/users` | Create a new user |
| `DELETE` | `/admin/users/{user_id}` | Delete a user |
| `PATCH` | `/admin/users` | Update user role or password |

#### Season Management
| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/seasons` | List all seasons |
| `POST` | `/admin/seasons` | Create a new season |
| `DELETE` | `/admin/seasons/{season_id}` | Delete a season |
| `PATCH` | `/admin/seasons/{season_id}/toggle` | Toggle season active status |

#### Grand Prix Management
| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/gps` | List GPs (optionally filtered by `season_id`) |
| `POST` | `/admin/gps` | Create a new Grand Prix |
| `PUT` | `/admin/gps` | Update GP details (name, date, season) |
| `DELETE` | `/admin/gps/{gp_id}` | Delete a GP and all associated data |
| `POST` | `/admin/seasons/{season_id}/import-gps` | Bulk import GPs from JSON file |
| `POST` | `/admin/gps/{gp_id}/sync` | Sync race results from the FastF1 API |

#### Race Results & Predictions (Admin)
| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/results/{gp_id}` | Get race result for editing |
| `PUT` | `/admin/results` | Create or update a race result (positions + events) |
| `PUT` | `/admin/predictions` | Create or update a user's prediction for a GP |

#### Team Management (Admin)
| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/seasons/{season_id}/teams` | List teams in a season with members |
| `POST` | `/admin/seasons/teams` | Create a team with a custom join code |
| `POST` | `/admin/teams/members` | Add a user to a team |
| `DELETE` | `/admin/teams/{team_id}/members/{user_id}` | Remove a user from a team |
| `DELETE` | `/admin/teams/{team_id}` | Delete a team |

#### F1 Grid (Constructors & Drivers)
| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/seasons/{season_id}/constructors` | List constructors with drivers |
| `POST` | `/admin/seasons/constructors` | Create a constructor |
| `POST` | `/admin/constructors/drivers` | Create a driver for a constructor |
| `DELETE` | `/admin/constructors/{id}` | Delete a constructor and its drivers |
| `DELETE` | `/admin/drivers/{id}` | Delete a driver |

### Grand Prix — `/grand-prix`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/grand-prix/` | Admin | Create a new Grand Prix |
| `GET` | `/grand-prix/season/{season_id}` | Public | List all GPs for a season |

### Predictions — `/predictions`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/predictions/` | User | Create or update a prediction (top-10 positions + events) |
| `GET` | `/predictions/{gp_id}/me` | User | Get my prediction for a specific GP |
| `GET` | `/predictions/{gp_id}/all` | Public | Get all users' predictions for a GP |

### Race Results — `/results`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/results/` | Admin | Update a race result |
| `GET` | `/results/{gp_id}` | User | Get the actual race result for a GP |

### Scoring — `/scoring`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/scoring/{gp_id}` | Admin | Calculate/recalculate scores for all predictions in a GP |

### Standings — `/standings`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/standings/season/{season_id}` | Public | Individual season standings (total points) |
| `GET` | `/standings/gp/{gp_id}` | Public | Individual standings for a single GP |
| `GET` | `/standings/team/season/{season_id}` | Public | Team standings for a season |

### Seasons — `/seasons`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/seasons/` | User | List all seasons |
| `GET` | `/seasons/{season_id}/teams` | User | Get player teams for a season |
| `GET` | `/seasons/{season_id}/constructors` | User | Get F1 constructors and drivers for a season |

### Teams — `/teams`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/teams/my-team` | User | Get current team info and invite code |
| `POST` | `/teams/create` | User | Create a new team (auto-generates join code) |
| `POST` | `/teams/join` | User | Join a team via invite code |
| `POST` | `/teams/leave` | User | Leave current team (auto-deletes if empty) |

### Bingo — `/bingo`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/bingo/tile` | Admin | Create a bingo tile for the active season |
| `PUT` | `/bingo/tile` | Admin | Update tile description or completion status |
| `DELETE` | `/bingo/tile/{tile_id}` | Admin | Delete a bingo tile |
| `GET` | `/bingo/board` | User | Get the bingo board with selection status per tile |
| `POST` | `/bingo/toggle/{tile_id}` | User | Toggle selection of a bingo tile (max 20 per user) |
| `GET` | `/bingo/standings` | Public | Bingo leaderboard (hits, misses, points) |

### Avatars — `/avatars`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/avatars/` | Public | Get all available avatars |
| `PUT` | `/avatars/me/{avatar_filename}` | User | Change the logged-in user's avatar |
| `POST` | `/avatars/upload` | Admin | Upload a new avatar image |
| `DELETE` | `/avatars/{avatar_id}` | Admin | Delete an avatar |

### Achievements — `/achievements`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/achievements/` | User | Get all achievements with user's unlock status |

### Stats — `/stats`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/stats/evolution` | Public | Points/position evolution chart data across a season |
| `GET` | `/stats/ranking` | Public | Global ranking bar chart for a season |
| `GET` | `/stats/users` | User | Lightweight user list for search/autocomplete |
| `GET` | `/stats/me` | User | Current user's detailed stats vs global average |
| `GET` | `/stats/user/{user_id}` | Public | Specific user's stats vs global average |

### Root

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Health check — returns `{ "message": "API Mundial F1 funcionando 🏎️" }` |

---

## Game Mechanics

### Race Predictions
Before each Grand Prix, users predict the **top-10 finishing positions** and **race events** (fastest lap, safety car occurrence, etc.). Predictions lock automatically at the race start time. After race results are entered (manually or synced via FastF1), an admin triggers score calculation.

### Scoring System
Points are awarded by comparing predictions against actual results:
- **Position accuracy** — Points based on how close predicted positions are to the actual finishing order.
- **Event predictions** — Bonus points for correctly predicting race events (fastest lap, safety cars, etc.).
- **Multipliers** — Configurable per season and event type via `multiplier_configs`.

### Teams
Players can form **2-person teams** per season. Teams are created with an auto-generated invite code (format: `XXX-XXX`). Team standings aggregate the scores of both members.

### Bingo
A season-long side game with ~50 prediction tiles (e.g., "Alonso gets a podium", "A race is red-flagged"). Each user selects up to **20 tiles**. As events occur throughout the season, admins mark tiles as completed. Scoring is based on hits and rarity (fewer selectors = more points).

### Achievements
Achievements are unlocked automatically based on prediction performance and are evaluated after each scoring calculation. Examples include streaks, perfect predictions, and special milestones.

### FastF1 Integration
Admins can sync real race results directly from the **FastF1** Python library, which provides access to official Formula 1 timing and telemetry data. This eliminates manual data entry for race positions and events.

---

## Testing

Tests are located in the `tests/` directory and use **pytest**.

```bash
# Run all tests
pytest

# Run with verbose output
pytest -v
```

---

## Authors

**Adrián Fernández** — [afertor01@gmail.com](mailto:afertor01@gmail.com)
**Miguel Ángel González** — [mangelgoca@gmail.com](mailto:mangelgoca@gmail.com)
