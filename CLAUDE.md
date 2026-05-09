# Cadence — Developer Guide

## What this is

A scheduling tool for independent recurring-lesson teachers (piano, tutoring, personal training). One teacher, ~50 students, fixed weekly slots per semester with exception handling. Built to replace scheduling over text messages.

## Stack

- **Next.js** (App Router), TypeScript strict mode
- **Supabase** — Postgres + Auth (magic-link for parents, email/password for teacher)
- **Tailwind CSS v4**
- **Gmail SMTP via nodemailer** — transactional email (no custom domain required)
- **Vercel** — hosting + daily cron
- **pnpm** — package manager

## Core design decisions

1. **Roster-first, not Calendly-style.** Each student has a recurring weekly slot. Lessons auto-generate from that template; the dynamic part is exceptions, not slot discovery.
2. **One parent account per family.** Siblings share a login and dashboard.
3. **Magic-link auth for parents.** No passwords. Teacher uses email/password.
4. **Invite-only parent access.** Parents can only sign in if the teacher has registered their email. No open self-signup.
5. **One-way iCal sync.** Teacher subscribes to a private `.ics` feed URL. No two-way calendar sync.
6. **UTC storage, Pacific display.** All timestamps stored in UTC; `formatLessonTime()` in `lib/format-lesson-time.ts` handles display in `America/Los_Angeles`. Never use raw `.toLocaleString()` or naive date math.
7. **Server-side enforcement for cancel cutoff.** Never trust the client.

## Data model

- `families` — `id`, `parent_name`, `parent_email`, `created_at`
- `students` — `id`, `family_id`, `name`, `active`
- `availability_periods` — `id`, `start_date`, `end_date` (semester boundaries)
- `availability_windows` — `id`, `period_id`, `weekday` (0–6), `start_time`, `end_time`
- `period_exceptions` — `id`, `period_id`, `exception_date` (partial-day overrides)
- `blackouts` — `id`, `start_date`, `end_date`, `reason` (full days off; lesson generator skips these)
- `recurring_assignments` — `id`, `student_id`, `weekday`, `start_time`, `duration_minutes`, `active_from`, `active_until`
- `lessons` — `id`, `student_id`, `scheduled_at` (timestamptz), `duration_minutes`, `status`, `note`, `parent_lesson_id`, `late_cancel`, `created_at`
- `teacher_settings` — single row: `ical_token`, `teacher_uid`

`status` enum: `scheduled` | `cancelled` | `rescheduled` | `completed` | `pending`

The `lessons` table is the source of truth. The generator runs on a rolling 12-week horizon and is idempotent — a unique partial index on `(student_id, scheduled_at) WHERE status = 'scheduled'` prevents duplicates.

## Conventions

- **Server Components by default.** Client components only where interactivity is required (`'use client'`).
- **Server Actions for all mutations.** No separate API layer for writes. Actions live in `_components/[route]-actions.ts` colocated with the route.
- **Supabase client directly** — no ORM. Use generated types from `types/supabase.ts`.
- **Two Supabase clients:** `createClient()` (RLS-enforced, user session) and `createServiceClient()` (service role, bypasses RLS — only use after validating ownership in application code).
- **`formatLessonTime(iso, format)`** — single helper for all time display. Never bypass it.
- Run `pnpm typecheck` and `pnpm lint` before considering any task done.

## Row Level Security

- Parents: SELECT/UPDATE on their own family's students and lessons only.
- Teacher: full access to all tables.
- Service role client used for inserts that parents trigger (e.g. reschedule creates a new lesson row) — ownership is validated in the Server Action before the service client is called.

## Email

Gmail SMTP via nodemailer (`lib/email.ts`). Teacher sets `GMAIL_USER` and `GMAIL_APP_PASSWORD` (App Password from Google Account settings). No custom domain required. All builders (`buildCancelEmail`, `buildRescheduleEmail`, etc.) live in `lib/email.ts`.

## Feature status

**Implemented:**
- Teacher auth, dashboard, pending-approval queue
- CRUD: families, students, availability periods + windows + exceptions, blackouts, recurring assignments
- Lesson generator (rolling 12 weeks, idempotent, cron + on-demand)
- Parent magic-link sign-in, invite-only gate
- Parent dashboard: upcoming lessons, cancel, reschedule, add lesson (one-off or trial)
- Email notifications: cancellation, reschedule, add-lesson, approval/decline
- iCal feed (`/api/ical/[token]`) for Apple Calendar subscription
- Lesson history: month calendar with per-student color coding, semester toggle, filtered list

**Not implemented (out of scope for now):**
- Billing, payments, invoicing
- SMS / push notifications
- Make-up credit tracking
- Multi-teacher support
- Two-way calendar sync
- Lesson reminder emails (Pass 3)
- Mobile responsiveness pass (Pass 3)
