# Sentimento

Survey platform for Zoom Experience Centers — collect, manage, and analyze feedback from Executive Briefing Center tour participants.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  React Frontend │────▶│  Express API    │────▶│     SQLite      │
│  (Vite + React) │     │  (Node.js)      │     │   (Prisma)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Survey Hierarchy

- **Surveys** — Assembled for a specific center + tour type (e.g., "SJ In-Person Tour")
- **Questionnaires** — Reusable question groups (e.g., "Follow-along", "In-Person Experience")
- **Questions** — Individual questions: multiple choice, emoji rating, multi-select, or text

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# Install all dependencies (root + client + server)
npm install

# Set up environment variables
cp server/.env.example server/.env
# Edit server/.env with your JWT secret

# Push database schema
npm run db:push

# Seed initial data (creates admin user, sample surveys)
npm run db:seed

# Start development servers
npm run dev
```

### Environment Variables

Copy `server/.env.example` to `server/.env` and fill in:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key-here"
PORT=3001
```

## Development

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite + React Router |
| Styling | Tailwind CSS (Gayathri + Raleway fonts) |
| State | React Context + React Query |
| Backend | Node.js + Express |
| Database | SQLite (Prisma ORM) |
| Auth | JWT + bcrypt |
| Validation | Zod |
| Charts | Recharts |

## Project Structure

```
sentimento/
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/     # Layout, survey renderer, tour controls
│   │   ├── pages/          # Admin + public survey pages
│   │   ├── context/        # Auth context
│   │   └── api/            # API client
│   └── package.json
├── server/                 # Express backend
│   ├── src/
│   │   ├── routes/         # REST API routes
│   │   ├── middleware/      # Auth, validation
│   │   └── services/       # Sentiment analysis
│   ├── prisma/             # Database schema
│   └── package.json
└── package.json            # Root workspace config
```
