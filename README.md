# Yoga Studio Management System

A full-stack web application for managing yoga studio operations, including session scheduling, teacher management, and user registrations.

## Tech Stack

### Backend
- Node.js 22 LTS
- Express.js 4.x
- TypeScript 5.4+ (Strict Mode)
- Prisma ORM
- PostgreSQL 16
- Zod (validation)
- JWT (authentication)
- bcrypt (password hashing)

### Frontend
- React 19 (Hooks only)
- TypeScript 5.9+ (Strict Mode)
- Vite 7.x
- TailwindCSS 4.x
- React Router 6.x
- Axios

### Testing & Quality
- **Backend**: Vitest (unit & integration tests), native `fetch`, v8 coverage
- **Frontend**: Vitest, React Testing Library, v8 coverage
- **End-to-End (E2E)**: Playwright, `monocart-reporter` (Chromium V8 coverage)

### Infrastructure
- Docker + Docker Compose
- PostgreSQL 16 container

## Features

### Authentication
- User registration
- User login with JWT tokens

### Sessions Management
- List all yoga sessions
- View session details
- Create new sessions (admin only)
- Update sessions (admin only)
- Delete sessions (admin only)
- Join/leave sessions (regular users)

### Teachers
- View list of teachers
- View teacher details

### User Profile
- View user profile
- Delete user account

## Prerequisites

- Node.js 22 LTS or higher
- Docker and Docker Compose
- npm

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/Walhezer/oc-projet-yoga-app.git
cd oc-projet-yoga-app
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

If you are running Playwright E2E tests for the first time, install the Playwright browsers:

```bash
npx playwright install
```

### 4. Set up Environment Variables

Create a `.env` file in the `backend` directory:

```bash
cd ../backend
cp .env.example .env
```

Default configuration matching `docker-compose.yml`:

```env
DATABASE_URL="postgresql://yogauser:yogapass@localhost:5432/yogastudio"
JWT_SECRET="your-secret-key-change-me-in-production"
PORT=8080
NODE_ENV=development
```

### 5. Start PostgreSQL with Docker

From the project root:

```bash
docker-compose up -d
```

This starts a `postgres:16-alpine` container (`yoga-studio-db`) on port `5432`.

### 6. Run Database Migrations & Seed

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

The seed script creates:
- 1 admin user: `yoga@studio.com` / `test!1234`
- 1 regular user: `user@test.com` / `test!1234`
- 3 teachers
- 4 yoga sessions

## Running the Application

### Start the Backend (Terminal 1)

```bash
cd backend
npm run dev
```

The API runs on `http://localhost:8080`.

### Start the Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

The frontend runs on `http://localhost:3000`.

## Default Credentials

**Admin User:**
- Email: `yoga@studio.com`
- Password: `test!1234`

**Regular User:**
- Email: `user@test.com`
- Password: `test!1234`

## Testing

The application is covered by unit tests, integration tests, and end-to-end (E2E) tests.

### 1. Backend Tests (Unit & Integration)

> **Prerequisites:** Make sure the PostgreSQL Docker container is running (`docker-compose up -d`).  
> Integration tests run sequentially (`fileParallelism: false` in `vitest.config.mts`) and reset database tables between test cases. If you need the default seed data afterward for manual or E2E testing, re-run `npm run prisma:seed`.

```bash
cd backend

# Run tests in watch mode
npm test

# Run all unit and integration tests once
npm run test:run
```

### 2. Frontend Tests (Unit & Integration)

```bash
cd frontend

# Run tests in watch mode
npm test

# Run all tests once with coverage
npm run test:coverage
```

### 3. End-to-End (E2E) Tests

> **Prerequisites:** Ensure PostgreSQL is running and seeded (`npm run prisma:seed`), and that the backend server (`http://localhost:8080`) is started. Playwright automatically starts or reuses the Vite frontend dev server (`http://localhost:3000`).

```bash
cd frontend

# Run Playwright E2E tests (headless) and generate coverage report
npm run test:e2e

# Run Playwright E2E tests with interactive UI
npm run test:e2e:ui

# Open the standard Playwright HTML execution report
npx playwright show-report
```

## Code Coverage Reports

Both backend and frontend exceed the **80% minimum coverage threshold** across all four indicators (Statements, Branches, Functions, Lines).

### Generating Coverage Reports

**Backend (Vitest):**

```bash
cd backend
npm run test:coverage
```

The HTML report is generated in `backend/coverage/index.html`.

**Frontend Unit & Integration (Vitest):**

```bash
cd frontend
npm run test:coverage
```

The HTML report is generated in `frontend/coverage/index.html`.

**Frontend E2E (Playwright + Monocart V8):**

```bash
cd frontend
npm run test:e2e
```

Playwright collects V8 code coverage via `tests/fixtures.ts` and `monocart-reporter`.  
The HTML coverage report is generated in `frontend/coverage-e2e/coverage/index.html`, and the full Monocart report can be opened with:

```bash
npx monocart show-report coverage-e2e/report.html
```

### Coverage Summary

| Scope | Statements | Branches | Functions | Lines | Threshold (≥ 80%) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Backend (Vitest)** | **98.90%** | **95.90%** | **97.67%** | **98.68%** | Passed |
| **Frontend (Vitest)** | **98.47%** | **98.26%** | **96.07%** | **98.46%** | Passed |
| **E2E (Playwright / V8)** | **84.55%** | **80.00%** | **87.72%** | **90.79%** | Passed |

- **Backend integration test ratio:** 33.3% (28 integration tests out of 84 total tests, above the 30% target).

## API Endpoints

### Health
- `GET /api/health` - Check API status (public)

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get JWT token

### Sessions
- `GET /api/session` - Get all sessions (protected)
- `GET /api/session/:id` - Get session by ID (protected)
- `POST /api/session` - Create session (admin only)
- `PUT /api/session/:id` - Update session (admin only)
- `DELETE /api/session/:id` - Delete session (admin only)
- `POST /api/session/:id/participate/:userId` - Join session (protected)
- `DELETE /api/session/:id/participate/:userId` - Leave session (protected)

### Teachers
- `GET /api/teacher` - Get all teachers (protected)
- `GET /api/teacher/:id` - Get teacher by ID (protected)

### Users
- `GET /api/user/:id` - Get user by ID (protected)
- `POST /api/user/promote-admin` - Promote current user to admin (development only, protected)
- `DELETE /api/user/:id` - Delete user account (protected)

## Database Schema

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  firstName String
  lastName  String
  password  String
  admin     Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  sessions  SessionParticipation[]
}

model Teacher {
  id        Int      @id @default(autoincrement())
  firstName String
  lastName  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  sessions  Session[]
}

model Session {
  id           Int       @id @default(autoincrement())
  name         String
  date         DateTime
  description  String
  teacherId    Int
  teacher      Teacher   @relation(fields: [teacherId], references: [id])
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  participants SessionParticipation[]
}

model SessionParticipation {
  sessionId Int
  userId    Int
  session   Session @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([sessionId, userId])
}
```

## Development Scripts

### Backend (`backend/`)

```bash
npm run dev              # Start development server with nodemon
npm run build            # Build TypeScript to JavaScript
npm start                # Start production server
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run database migrations
npm run prisma:seed      # Seed the database
npm run prisma:studio    # Open Prisma Studio
npm test                 # Run Vitest in watch mode
npm run test:run         # Run all backend tests once
npm run test:coverage    # Run backend tests and generate coverage report
```

### Frontend (`frontend/`)

```bash
npm run dev              # Start Vite development server
npm run build            # Build for production
npm run preview          # Preview production build
npm test                 # Run Vitest in watch mode
npm run test:coverage    # Run frontend tests and generate coverage report
npm run test:e2e         # Run Playwright E2E tests & generate E2E coverage report
npm run test:e2e:ui      # Run Playwright E2E tests in UI mode
```

## Project Structure

```
oc-projet-yoga-app/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Request handlers & integration tests
│   │   ├── services/         # Business logic & unit tests
│   │   ├── middleware/       # Auth & error handling middlewares
│   │   ├── dto/              # Zod validation schemas
│   │   ├── utils/            # JWT utilities & unit tests
│   │   ├── routes/           # API routes
│   │   └── app.ts            # Express app setup & integration tests
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema
│   │   └── seed.ts           # Database seeding
│   ├── vitest.config.mts
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── pages/            # React page components & integration tests
│   │   ├── components/       # Reusable components & unit tests
│   │   ├── services/         # API services & unit tests
│   │   ├── types/            # TypeScript types
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── tests/                # Playwright E2E tests & V8 coverage fixtures
│   ├── playwright.config.ts
│   ├── vite.config.ts
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Troubleshooting

### Database connection issues
```bash
# Check if PostgreSQL is running
docker ps

# Restart PostgreSQL
docker-compose restart postgres

# View logs
docker-compose logs postgres
```

### Prisma issues
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Regenerate Prisma client
npm run prisma:generate
```

## License

MIT