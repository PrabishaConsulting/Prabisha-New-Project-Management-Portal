# Project Overview

This is a full-featured project management application, a clone of Kaneo. It is built with Next.js 14 (using the App Router), TypeScript, and Tailwind CSS for the frontend. The backend is powered by Next.js API Routes, with Prisma as the ORM for a MySQL database. The application features a comprehensive authentication system, workspace and project management, a Kanban board, and time tracking.

# Building and Running

The project uses Yarn as the package manager.

- **Install dependencies:** `yarn install`
- **Run the development server:** `yarn dev`
- **Build the project:** `yarn build`
- **Start the production server:** `yarn start`
- **Lint the code:** `yarn lint`

## Database

- **Push database schema changes:** `yarn db:push`
- **Generate Prisma client:** `yarn db:generate`
- **Seed the database:** `yarn db:seed`
- **Open Prisma Studio:** `yarn db:studio`

## Testing

- **Run all tests:** `yarn test`
- **Run frontend tests:** `yarn test:frontend`
- **Run backend tests:** `yarn test:backend`
- **Run tests in watch mode:** `yarn test:watch`

# Development Conventions

- **Framework:** The project uses Next.js with the App Router.
- **Styling:** Tailwind CSS is used for styling, with components from shadcn/ui.
- **State Management:** Zustand is used for state management.
- **Database:** Prisma is the ORM for the MySQL database. The schema is located at `prisma/schema.prisma`.
- **API:** API routes are located in the `app/api/` directory.
- **Components:** Reusable components are located in the `components/` directory.
- **Authentication:** The application uses a custom JWT-based authentication system.
- **Testing:** Jest is used for testing. Test files are located in the `__tests__/` directory.
