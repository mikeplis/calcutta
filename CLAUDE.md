# Calcutta Project Instructions

## Build and test
- `npx tsc -b` — TypeScript type checking (strict mode)
- `npx vitest run` — run all tests
- `npm run deploy` — build and deploy to Firebase Hosting

## After every code change
- Consider whether new or updated tests are warranted. If so, add them before moving on.
- Run both `npx tsc -b` and `npx vitest run` before considering work complete.

## Stack
- React 19, TypeScript, Tailwind CSS v4, Vite, Zustand
- Firebase (Firestore + Hosting)
- Vitest + React Testing Library for tests

## Architecture
- `src/domain/` — pure logic and types, no side effects
- `src/service/` — Firebase and local auction service implementations
- `src/screens/` — page-level components
- `src/screens/components/` — reusable UI components
- `src/hooks/` — React hooks
