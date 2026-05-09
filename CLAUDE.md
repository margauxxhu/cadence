# Piano Teacher Scheduling App

## Context

A scheduling tool for a single piano teacher in the Bay Area, CA, replacing her current workflow of managing ~30 students' lessons through chat messages. Most students take a recurring weekly lesson that stays fixed for a semester; the actual work is handling exceptions (skips, reschedules, holiday weeks).

The user (Max) is building this with Claude Code, deploying to GitHub, and wants it to be effectively free to host.

## Goals

- Replace at least 60% of scheduling chats in the MVP
- Be smoother for parents than just texting her — if it isn't, they'll abandon it
- Zero hosting cost on Vercel + Supabase free tiers
- Clean enough to be a portfolio project on GitHub

## Stack

- **Next.js** (latest, App Router), TypeScript strict mode
- **Supabase** for Postgres + Auth (magic-link email)
- **Tailwind CSS** for styling
- **Resend** for transactional email (free tier, 3,000/mo)
- **Deploy**: Vercel hobby tier
- **Package manager**: pnpm
- **Repo**: GitHub, deployed via Vercel's GitHub integration

## Core Design Decisions (don't relitigate without asking Max)

1. **Roster-first, not Calendly-style.** Each student has a recurring weekly slot. Lessons are auto-generated from that template. The dynamic part is exceptions, not slot discovery.
2. **One parent account per family** (siblings share a login and dashboard).
3. **Magic-link auth for parents.** No passwords. Teacher uses standard email/password (or also magic link — Max's call).
4. **One-way iCal sync to Apple Calendar.** Teacher subscribes to a private `.ics` feed URL we generate. We do NOT do two-way calendar sync.
5. **Times stored as UTC, displayed in `America/Los_Angeles`.** Use a real timezone library (`date-fns-tz` or `dayjs` + timezone plugin). No naive date math.
6. **Server-side enforcement for cancel cutoff.** Never trust the client.

## Data Model

Six tables. The `lessons` table is the source of truth — every individual occurrence is a row, generated from recurring templates and individually editable.

- `families` — `id`, `parent_name`, `parent_email`, `created_at`
- `students` — `id`, `family_id`, `name`, `active`
- `availability_template` — `id`, `weekday` (0–6), `start_time`, `end_time` (the teacher's working windows, e.g. Tue 3pm–7pm)
- `blackouts` — `id`, `start_date`, `end_date`, `reason` (holidays, vacation; lesson generator skips these)
- `recurring_assignments` — `id`, `student_id`, `weekday`, `start_time`, `duration_minutes`, `active_from`, `active_until` (nullable)
- `lessons` — `id`, `student_id`, `scheduled_at` (timestamptz), `duration_minutes`, `status`, `note`, `parent_lesson_id` (nullable, links a rescheduled lesson back to the original), `created_at`

`status` enum: `scheduled` | `cancelled` | `rescheduled` | `completed`

Lesson generator runs on a rolling 12-week horizon, idempotent (re-running must not duplicate). Trigger it on cron (Vercel Cron) and also after any change to `recurring_assignments` or `blackouts`.

Use Supabase **Row Level Security**: a parent can only read/write rows for their own family's students/lessons. Teacher account has full access.

## Build Phases

Stay in the current phase. Do not implement Pass 2 features while Pass 1 is in progress.

### Pass 1 — Core (start here)

- Teacher auth + dashboard
- CRUD for availability template, families/students, recurring assignments
- Lesson generator (rolling 12 weeks, idempotent, skips blackouts)
- Parent magic-link sign-in
- Parent dashboard: list of upcoming lessons for all kids in the family
- Parent can **cancel** a lesson with a required note, only if `now() + cutoff_hours < scheduled_at`
- Email teacher on every cancellation (via Resend)
- iCal feed endpoint for teacher (`/api/ical/[teacher_token]`) returning all `scheduled` lessons as `text/calendar`

### Pass 2 — Useful

- Reschedule flow: parent picks a lesson → sees available slots in next 2–4 weeks (teacher's open windows minus other students' booked slots, names hidden) → picks one → atomic cancel+create with `parent_lesson_id` link → one email to teacher summarizing the move
- Teacher "blackout" bulk action: pick a date range, auto-cancel all affected lessons, email all affected parents at once
- Teacher stats dashboard: lessons taught this month/quarter/year, with prior-period comparison

### Pass 3 — Polish

- Lesson reminder email to parents 24h before
- Mobile responsiveness pass
- Empty states, loading states, error handling pass

## Conventions

- Server components by default; client components only when interactivity requires it
- Server Actions for mutations
- Use Supabase client directly with generated TypeScript types — no extra ORM layer
- All user-facing times rendered through a single `formatLessonTime()` helper to keep the timezone consistent
- Keep components small; colocate route-specific components in the route folder
- Run `pnpm typecheck` and `pnpm lint` before declaring any task done

## Out of Scope (don't build these even if they seem useful)

- Billing, payments, invoicing, taxes
- SMS / push notifications
- Make-up credit tracking
- Trial or one-off lessons (recurring only for now)
- Multi-teacher support
- Two-way calendar sync

## Things to Confirm with Max Before Assuming

These should be asked at the start of the first session, not guessed:

- **Cancel cutoff hours** (default 24 if unanswered)
- **Default lesson duration** (30 / 45 / 60 min)
- **Typical availability windows** (e.g. weekdays 3pm–7pm, Sat 9am–12pm)
- **Whether to enforce cancel cutoff strictly** or allow late cancellations with a warning + flag to teacher
- **Resend "from" address** (initial: use Resend's default sender domain; custom domain later)

## Working Style

- When a UX detail is unclear, propose 2 options to Max rather than picking silently
- Show local-dev screenshots / describe what was built before claiming "done"
- Don't scope-creep across phases
- If an architectural decision conflicts with this file, surface the conflict instead of just overriding it
