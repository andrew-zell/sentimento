# EBC Survey Tool

Executive Briefing Center Survey Tool - A modular survey platform with React frontend, Node.js/Express backend, and PostgreSQL database.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  React Frontend │────▶│  Express API    │────▶│   PostgreSQL    │
│  (Vite + React) │     │  (Node.js)      │     │   (Fly.io)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Three-Tier Survey Hierarchy

- **Surveys** - Assembled surveys for specific scenarios (e.g., "SJ In-Person Tour")
- **Questionnaires** - Reusable groups of questions (e.g., "Follow-along", "In-Person Experience")
- **Questions** - Individual questions with various types (multiple choice, emoji, multi-select, text)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp server/.env.example server/.env
# Edit server/.env with your database credentials

# Run database migrations
npm run db:migrate

# Seed the database (optional)
npm run db:seed

# Start development servers
npm run dev
```

### Environment Variables

Create a `server/.env` file:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/ebc_surveys"
JWT_SECRET="your-secret-key"
PORT=3001
```

## Development

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite + React Router |
| Styling | Tailwind CSS |
| State | React Context + React Query |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT + bcrypt |
| Validation | Zod |
| Charts | Recharts |

## Project Structure

```
ebc-survey-tool/
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route pages
│   │   ├── hooks/          # Custom React hooks
│   │   ├── context/        # Auth & app context
│   │   └── api/            # API client functions
│   └── package.json
├── server/                 # Express backend
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── controllers/    # Business logic
│   │   ├── middleware/     # Auth, validation
│   │   └── services/       # Sentiment, aggregation
│   ├── prisma/             # Database schema
│   └── package.json
└── package.json            # Root workspace config
```

