# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Setup and Installation
```bash
yarn install           # Install dependencies
yarn postinstall       # Generate Prisma client (runs automatically after install)
```

### Development
```bash
yarn dev               # Start Next.js development server
yarn check-env         # Validate environment variables
yarn build             # Build for production
yarn start             # Start production server
```

### Database
```bash
yarn db:push           # Push schema changes to database
yarn db:generate       # Generate Prisma client
yarn db:seed           # Seed database with test data (uses seed2.js)
yarn db:studio         # Open Prisma Studio
yarn db:backup         # Backup database using TypeScript script
yarn db:backup:sql     # Direct SQL backup using mysqldump
```

### Testing and Quality
```bash
yarn test              # Run Jest tests
yarn test:watch        # Run tests in watch mode
yarn lint              # Run Next.js ESLint
```

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Database**: MySQL with Prisma ORM
- **Authentication**: NextAuth.js with Prisma adapter
- **UI Components**: Radix UI with custom design system
- **State Management**: Jotai and Zustand
- **Styling**: Tailwind CSS 4.0
- **File Storage**: ImageKit integration

### Database Schema
The application uses Prisma with MySQL and features a comprehensive schema for:

- **User Management**: Users with roles (ADMIN, MANAGER, MEMBER), departments, and user types (INTERNAL, CLIENT)
- **Workspace System**: Multi-tenant workspaces with role-based access (OWNER, ADMIN, MEMBER)
- **Project Management**: Projects with status tracking, priorities, and client/internal categorization
- **Task System**: Kanban-style tasks with time tracking, comments, attachments, and activity logs
- **Calendar Integration**: Workspace calendars with various event types (meetings, deadlines, etc.)
- **Asset Management**: Domain, hosting, VPS, and SSL certificate tracking with renewal management
- **Notification System**: User notifications with read status tracking
- **Mistake Learning**: Log and track mistakes for learning purposes

### Key Directories

- `app/` - Next.js App Router pages and API routes
  - `api/` - REST API endpoints
  - `(admin)/` - Admin-only pages
  - `(auth)/` - Authentication pages
  - `(pages)/` - Main application pages
- `components/` - Organized by feature modules (auth, calendar, kanban, etc.)
- `lib/` - Utility functions, database connection, validation schemas
- `actions/` - Server Actions for data mutations
- `prisma/` - Database schema and migrations
- `types/` - TypeScript type definitions

### Important Configuration

**Prisma Client**: Generated to `app/generated/client` (not default location)

**Environment Validation**: The `check-env` script validates required environment variables before builds

**Image Domains**: Configured for multiple domains including prabisha.com, res.cloudinary.com, and others

**Database Backup**: Both TypeScript and SQL backup solutions available

### Development Patterns

- Uses Server Actions for data mutations instead of API routes where possible
- Implements role-based access control across workspaces and projects
- Features comprehensive activity logging for audit trails
- Supports both internal users and external clients
- Uses custom Prisma client location for better organization
- Implements proper error handling with Zod validation

## Notes for Claude Code

When working with this codebase:
- Always run `yarn check-env` before building to ensure environment variables are properly configured
- Remember that Prisma client is in a custom location (`app/generated/client`)
- Use Server Actions for mutations when possible
- Follow the established patterns for role-based access control
- Maintain activity logging for important user actions
- Use Zod schemas for validation before database operations