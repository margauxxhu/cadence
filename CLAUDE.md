# Cadence — Developer Guide

Scheduling tool for independent recurring-lesson teachers. One teacher, ~50 students, fixed weekly slots per semester. Exceptions (cancels, reschedules, blackouts) are the real work.

## Stack
Next.js App Router · Supabase (Postgres + Auth) · Tailwind CSS v4 · Gmail SMTP (nodemailer) · Vercel · pnpm

## Key decisions
1. **Roster-first.** Lessons auto-generate from recurring assignments. Parents manage exceptions, not slot discovery.
2. **Invite-only parents.** Magic-link sign-in only works if the teacher has registered the parent's email.
3. **UTC storage, Pacific display.** All timestamps in UTC. Use `formatLessonTime()` in `lib/format-lesson-time.ts` — never bypass it.
4. **RLS at the DB layer.** Parents read/write their family's data only. Teacher has full access. Never rely on application-layer checks alone.
5. **Service role client is a footgun.** Only use `createServiceClient()` after verifying ownership in application code. Every usage must have a comment explaining why it's safe.
6. **Idempotent lesson generator.** Unique partial index on `(student_id, scheduled_at) WHERE status = 'scheduled'` prevents duplicates. Re-running is always safe.

## Data model
- `families` · `students` · `recurring_assignments` — roster
- `availability_periods` + `availability_windows` + `period_exceptions` — when teacher works
- `blackouts` — full days off; lesson generator skips these
- `lessons` — source of truth; every occurrence is a row (`status`: scheduled · cancelled · rescheduled · completed · pending)
- `teacher_settings` — single row: `ical_token`, `teacher_uid`

## Conventions
- Server Components by default; `'use client'` only for interactivity
- Server Actions for all mutations — colocated in `_components/[route]-actions.ts`
- `createClient()` for user-session queries (RLS enforced)
- `createServiceClient()` for bypassing RLS — always with an ownership check first
- `pnpm typecheck && pnpm lint` before done

## What's built
Teacher: auth, dashboard, pending approvals, families/students CRUD, availability periods, blackouts, recurring assignments, lesson history (month calendar + list)
Parent: magic-link sign-in, upcoming lessons, cancel, reschedule, add lesson (immediate or pending approval)
Shared: lesson generator (rolling 12 weeks, cron + on-demand), Gmail email notifications, iCal feed

## Out of scope
Billing · SMS · make-up credit tracking · multi-teacher · two-way calendar sync
