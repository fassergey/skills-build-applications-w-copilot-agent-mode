# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

- Presentation tier decision: Keep the frontend as a thin React UI that consumes the API contract and renders activity, team, leaderboard, and workout data with accessible Bootstrap layouts. Use the shared client and route-level components to display real API responses without introducing extra state-management layers beyond what the app already needs.
- Logic tier decision: Implement the Express + TypeScript routes and services in `octofit-tracker/backend/src` around the API contract with input validation and centralized error handling. Normalize cast errors and invalid IDs into deliberate 4xx responses so the API never leaks a MongoDB validation failure as a 500.
- Data tier decision: Fix the Mongoose schemas and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` so required fields, relationships, and derived values are enforced before requests hit the API. Keep the persisted data shape aligned to the seeded user/team/activity/workout records used by the contract and tests.
- Activity tracking approach: Create each activity with a valid `user` and `team`, store the submitted `type` and `minutes`, and compute `points` and `occurredAt` at creation time. Reject malformed IDs or missing references with explicit 4xx responses so activity creation and listing remain valid and deterministic.
- Team management approach: Require a team `name` and `mascot` when creating a team and preserve the submitted `members` array structure. Validate memberships through the existing user records so invalid or missing team members cannot be created through the API.
- Leaderboard approach: Aggregate each team's activity points, sort totals descending, and assign a 1-based rank to each result. Return the expected response shape of `{ teamName, totalPoints, rank }` so the frontend can render sorted rankings directly.
- Workout suggestions approach: Match the requested user by email to the seeded user set, then use recent activity patterns to recommend workouts aligned with the user's goal or focus area. Ensure the first suggestion's `focus` and `reason` reflect the most relevant pattern while returning a deliberate 4xx when no matching user email exists.

## Test plan

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend`
  - Current result: 4 failing validation tests and 1 passing seed/idempotence test.
  - Failure meaning: the data model is missing required field validation and relationship enforcement for users, teams, activities, and workout suggestions.
- API command: `npm run test:api --prefix octofit-tracker/backend`
  - Current result: 4 failing contract tests.
  - Failure meaning: the backend still returns placeholder or 501 responses instead of implementing required validation, leaderboard aggregation, and workout matching behavior.
- Frontend command: `npm test --prefix octofit-tracker/frontend`
  - Current result: 15 failing presentation tests.
  - Failure meaning: the app still renders placeholder status text instead of the required activity, teams, leaderboards, and workout suggestion views.
- Backend build command: `npm run build --prefix octofit-tracker/backend`
  - Not yet run; this verifies TypeScript compilation after the data and API contracts are implemented.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend`
  - Not yet run; this verifies the React app compiles cleanly after the UI contract is implemented.
