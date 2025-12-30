# GamePulse

## Overview

GamePulse is a cyberpunk-themed game tracking web application that allows users to manage their gaming library. Users can track games across different statuses (active, completed, backlog), log playtime, categorize by platform and vibe, and get random game recommendations from their backlog. The application features a distinctive neon-styled UI with custom components.

## Recent Changes
- Fixed CSS crash in `index.css` by changing `border-border` to `border-gray-700`.
- Implemented Mood-Based Roulette for 'Pick a Game' functionality.
- Added Settings modal with 'Reset All Data' and 'Share My Vault' features.
- Enhanced empty state illustrations and haptic pop animations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management
- **UI Components**: Custom cyberpunk-themed components built on top of shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS with custom theme configuration featuring neon colors and cyberpunk aesthetics
- **Forms**: React Hook Form with Zod validation
- **Animations**: Framer Motion for page transitions and UI animations

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **API Pattern**: RESTful endpoints defined in `shared/routes.ts` with Zod schemas for validation
- **Authentication**: Passport.js with local strategy, session-based auth using express-session
- **Password Security**: scrypt hashing with random salts

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **Schema Location**: `shared/schema.ts` contains Drizzle table definitions
- **Migrations**: Drizzle Kit for database migrations (output to `./migrations`)

### Shared Code
- **Location**: `shared/` directory contains code used by both frontend and backend
- **Schema**: Database models and Zod validation schemas in `shared/schema.ts`
- **API Routes**: Typed API route definitions with input/output schemas in `shared/routes.ts`

### Build System
- **Development**: Vite dev server with HMR for frontend, tsx for running TypeScript server
- **Production**: Custom build script using esbuild for server bundling and Vite for client

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries and schema management

### Third-Party Services
- **Supabase**: Client SDK present for potential future integration (credentials in `client/src/lib/supabase.ts`)
- **RAWG API**: Used for game search functionality in the Dashboard (fetches game metadata and cover images)

### Key NPM Packages
- **UI**: Radix UI primitives, Tailwind CSS, class-variance-authority, Framer Motion
- **Forms**: react-hook-form, @hookform/resolvers, zod
- **Data Fetching**: @tanstack/react-query
- **Authentication**: passport, passport-local, express-session
- **Database**: drizzle-orm, pg, connect-pg-simple