# Spot Exchange Platform

A modern, multi-tenant freight exchange platform built with Next.js, Express, and Supabase. Designed to connect carriers with spot opportunities through real-time bidding and collaboration.

## 🚀 What We've Built

### ✅ Core Architecture
- **API-First Design**: RESTful Express.js API ready for both web and mobile
- **Multi-tenant**: Secure tenant isolation using Supabase Row Level Security
- **Type-safe**: Full TypeScript coverage with shared types across frontend and backend
- **Monorepo**: Organized with Turbo for efficient development

### ✅ Backend Features
- **Authentication**: Supabase Auth with JWT tokens
- **Opportunities API**: CRUD operations for freight opportunities
- **Bidding System**: Place, update, withdraw bids with validation
- **Real-time Collaboration**: Message system with activity feeds
- **Role-based Access**: Carrier, Account Manager, Admin roles
- **Security**: Rate limiting, CORS, input validation with Zod

### ✅ Database Schema
- Complete PostgreSQL schema with proper relationships
- Row Level Security policies for multi-tenant isolation  
- Triggers for activity logging and bid updates
- Optimized indexes for performance

### ✅ Frontend Foundation
- Next.js 14 with App Router
- Tailwind CSS with custom component classes
- Supabase client integration
- API client with real-time capabilities

## 🏗 Project Structure

```
spot-exchange/
├── apps/
│   ├── api/              # Express.js API server
│   │   ├── src/routes/   # API endpoints
│   │   ├── src/middleware/   # Auth, error handling
│   │   └── src/controllers/  # Business logic
│   └── web/              # Next.js web application
│       ├── src/app/      # App router pages
│       ├── src/components/   # React components  
│       └── src/lib/      # Utilities and API client
├── packages/
│   ├── shared/           # Types, schemas, API client
│   │   ├── src/types/    # TypeScript interfaces
│   │   ├── src/schemas/  # Zod validation schemas
│   │   └── src/api-client/   # Shared API client
│   └── database/         # Supabase client and queries
│       ├── src/client.ts     # Database connection
│       ├── src/queries.ts    # Reusable queries
│       └── supabase/migrations/  # SQL migrations
└── package.json          # Monorepo root
```

## 🎯 Key Features Implemented

### Multi-Tenant Architecture
- Tenant isolation via Supabase RLS
- Subdomain-based tenant routing ready
- Secure data access controls

### Real-time Bidding
- Live bid updates via Supabase Realtime
- Bid validation and conflict resolution
- Activity logging for audit trails

### Collaboration System
- Real-time messaging between carriers and account managers
- Document sharing capabilities (structure ready)
- Activity feeds for transparency

### API-First Design
- RESTful endpoints for all operations
- Shared TypeScript types ensure consistency
- Ready for mobile app development with Expo

## 🛠 Technology Stack

- **Runtime**: Bun (ultra-fast JavaScript runtime)
- **Backend**: Express.js, TypeScript, Supabase
- **Frontend**: Next.js 14, React, Tailwind CSS
- **Database**: PostgreSQL (via Supabase)
- **Real-time**: Supabase Realtime
- **Validation**: Zod schemas
- **Build**: Turbo (monorepo)
- **Auth**: Supabase Auth

## 🚧 Next Steps for MVP

1. **Authentication UI**: Login/register forms with Supabase Auth
2. **Dashboard**: Opportunity listing with filters and search
3. **Bidding Interface**: Bid placement with success probability indicator
4. **Real-time Chat**: Message threads for opportunities
5. **Price Lock Feature**: UI for 24/48 hour price locks
6. **Mobile App**: Expo React Native app consuming the same API

## 🔒 Security Features

- Row Level Security (RLS) for data isolation
- JWT-based authentication
- Role-based access control (RBAC)
- Input validation with Zod
- Rate limiting and CORS protection
- Secure environment variable handling

## 📱 Mobile Ready

The API-first architecture makes it trivial to add mobile apps:
- Shared TypeScript types
- Same authentication flow
- Identical API endpoints
- Real-time features work across platforms

## 🎨 Inspired Features

Inspired by Uber Freight Exchange Spot:
- **Smart Matching**: Algorithm-based opportunity matching
- **Book-it-now Pricing**: Instant acceptance rates
- **Bid Success Prediction**: ML-ready probability indicators
- **Price Lock Options**: Risk mitigation for carriers

## 🚀 Getting Started

1. Clone and install dependencies
2. Set up Supabase project and run migrations
3. Configure environment variables
4. Start development servers: `npm run dev`

See `setup.md` for detailed instructions.

---

This platform provides a solid foundation for a modern freight exchange with room to grow into advanced features like ML-based matching, mobile apps, and sophisticated analytics.