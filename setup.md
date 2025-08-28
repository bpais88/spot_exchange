# Spot Exchange Platform Setup Guide

## Prerequisites

- **Bun runtime** installed ([bun.sh](https://bun.sh) - `curl -fsSL https://bun.sh/install | bash`)
- Supabase account
- Node.js 18+ (for Next.js web app)

## Setup Instructions

### 1. Install Dependencies

```bash
# Install all dependencies
bun install

# Or use npm for workspaces compatibility
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your project URL and anon key from the API settings
3. Run the database migrations:

```bash
# Copy the SQL from packages/database/supabase/migrations/ 
# and run it in your Supabase SQL editor, in order:
# - 001_initial_schema.sql
# - 002_row_level_security.sql
```

### 3. Environment Variables

Create `.env` files in both apps:

**apps/api/.env:**
```
PORT=4000
NODE_ENV=development

SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

ALLOWED_ORIGINS=http://localhost:3000

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

JWT_SECRET=your_jwt_secret_here
```

**apps/web/.env.local:**
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

### 4. Development

Start the development servers:

```bash
# Start all services with Turbo
bun run dev

# Or start individually:
cd apps/api && bun run dev     # API with Bun (ultra-fast!)
cd apps/web && npm run dev     # Web with Next.js
```

**Bun Benefits:**
- ⚡ **3x faster startup** - API server starts instantly
- 🔥 **Hot reload** - Changes reflect immediately
- 📦 **Direct TypeScript** - No compilation step needed

## Project Structure

```
spot-exchange/
├── apps/
│   ├── api/          # Express.js API server
│   └── web/          # Next.js web application
├── packages/
│   ├── shared/       # Shared types, schemas, and API client
│   ├── database/     # Supabase client and queries
│   └── ui/           # Shared UI components
└── package.json      # Monorepo root
```

## API Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user
- `GET /api/opportunities` - List opportunities
- `POST /api/opportunities` - Create opportunity (account managers)
- `GET /api/opportunities/:id` - Get opportunity details
- `POST /api/opportunities/:id/bids` - Place bid (carriers)
- `GET /api/opportunities/:id/messages` - Get messages
- `POST /api/opportunities/:id/messages` - Send message

## Database Schema

The platform uses PostgreSQL with the following main tables:
- `tenants` - Multi-tenant organization data
- `users` - User profiles and roles
- `opportunities` - Freight opportunities
- `bids` - Carrier bids on opportunities
- `opportunity_messages` - Real-time chat messages
- `opportunity_activity` - Activity feed

## Features

### ✅ Implemented
- Multi-tenant architecture
- Authentication with Supabase
- RESTful API with Express.js
- Opportunity management
- Bidding system
- Real-time collaboration (messages)
- Row-level security

### 🚧 Next Steps
- Next.js web application
- Real-time updates with Supabase Realtime
- Price lock functionality
- Bid success predictor UI
- File upload for documents
- Mobile app preparation

## Security

- Row Level Security (RLS) policies ensure tenant isolation
- JWT-based authentication
- Role-based access control
- Rate limiting and CORS protection
- Input validation with Zod schemas