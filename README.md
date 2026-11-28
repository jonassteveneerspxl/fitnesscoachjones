# FitnessCoachJones

A fast, mobile-first workout tracker. Log strength, timed and cardio exercises, rate how a session went, and follow your progress over time. Data is stored per user in Firebase and the app keeps working offline.

**Live demo:** https://fitnesscoachjones.vercel.app/ (the interface is in Dutch)

## Features

- **Fast workout logging:** pick an exercise, enter weight × reps per set, and see your previous performance right in the form. Unsaved drafts survive a page reload.
- **Three kinds of exercises:** strength (weight × reps), timed holds such as planks or dead hangs (duration plus optional extra weight), and cardio (activity, distance, time, with pace or speed calculated for you). Custom exercises can be added in any of the three kinds.
- **Cardio as warm-up or as a session:** the warm-up from your last workout is proposed again, so logging it takes one tap.
- **Post-workout rating:** after saving, a "How did it go?" screen asks for a score from 1 to 10 with a face that changes as you slide. It can always be skipped, and a session can be rated later from the history.
- **Statistics:** weekly comparison, personal records (with a clear explanation of what counts as a PR), estimated 1RM trends (Epley), volume, and the average rating per week plus its trend.
- **Calendar:** monthly overview of training and rest days, with the rating of each day.
- **Accounts:** Google or email sign-in. Every user only sees their own data.
- **Offline-first:** Firestore persistence means logging works without a connection and syncs later.
- **Data export** of your own workouts.

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | React 18, TypeScript, Vite |
| UI | Tailwind CSS, shadcn/ui (Radix primitives), Recharts |
| Routing | React Router |
| Backend | Firebase Authentication and Cloud Firestore |
| Hosting | Vercel |
| Testing | Vitest, Testing Library |

## Architecture notes

- **Repository pattern for storage.** The UI talks to a `WorkoutRepository` interface (`src/utils/workoutStorage.ts`). There is a local implementation and a Firestore-backed one (`remoteWorkoutRepository.ts`), so the storage layer can be tested without a network and swapped without touching the UI.
- **Pure domain logic.** Statistics, calendar, ratings, cardio maths and one-rep-max calculations are plain functions in `src/utils`, covered by unit tests, and kept separate from React components.
- **Defensive data handling.** Every workout read from storage passes through `normalizeWorkout`. Derived fields (volume, estimated 1RM) are recalculated, invalid values are dropped, and older data formats keep loading.
- **Time zones done right.** Each workout stores its UTC instant and its own time zone, so a late-evening session lands on the right day and in the right ISO week.
- **Security in the database rules.** `firestore.rules` restricts every read and write to the signed-in owner, validates the shape of documents and forbids hard deletes (workouts are soft-deleted).
- **Mobile attention to detail.** The on-screen keyboard is handled through the Visual Viewport API, and the back button closes sheets before leaving the page.

```
src/
  components/   UI building blocks (workout form, history, charts, sheets)
  pages/        Home, Statistics, Calendar, Settings
  context/      Auth, repository and exercise-catalogue providers
  hooks/        Reusable hooks (visual viewport, back-to-close, ...)
  lib/          Firebase setup and adapters
  utils/        Domain logic, normalisation, storage, statistics
  test/         Unit and integration tests
```

## Getting started

Requires Node.js 18 or newer.

```sh
git clone https://github.com/jonassteveneerspxl/fitnesscoachjones.git
cd fitnesscoachjones
npm install
npm run dev
```

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run preview` | Preview the production build |
| `npm test` | Run the test suite once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Lint the code |

### Using your own Firebase project

The app is configured for the author's Firebase project by default. To use your own, create a project with Authentication and Firestore, then set these variables (for example in a `.env.local` file or in Vercel):

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Publish `firestore.rules` to your project. The one-time console setup is described (in Dutch) in [`docs/FIREBASE-INSTELLEN.md`](docs/FIREBASE-INSTELLEN.md).

## Testing

The suite contains 350+ tests covering the domain logic, storage and normalisation, the Firestore adapter, authentication flows, and the main user flows (logging, editing, statistics, calendar and rating).

## About

Built by Jonas as a personal project, in close contact with real users who test it on their phones. Their feedback shaped features such as timed exercises, cardio logging and the post-workout rating.
