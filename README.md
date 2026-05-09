# Cadence

Scheduling software built for a single piano teacher managing ~50 students. Replaces the back-and-forth of text messages for cancellations and reschedules with a clean parent-facing portal — without requiring parents to create yet another account.

## Why Cadence

Most scheduling tools (Calendly, Acuity, etc.) are built around one-off bookings. Piano lessons don't work that way: every student has a fixed recurring slot for the semester. The real work is handling the exceptions — a sick kid, a holiday week, a family vacation.

Cadence is designed around that reality:

- **Roster-first, not booking-first.** Lessons are auto-generated from each student's recurring weekly slot. The teacher sets the template once; Cadence handles the calendar.
- **Exception management, not slot discovery.** Parents see their upcoming lessons and can cancel with a note. No browsing, no back-and-forth.
- **No app to install.** Parents sign in with a magic link sent to their email. One tap, done.
- **iCal feed, not another calendar.** The teacher subscribes to a private feed URL that appears natively in Apple Calendar. No separate app, no dashboard to check.
- **Free to host.** Runs entirely on Vercel and Supabase free tiers.

## Features

**Teacher**
- Dashboard with this week's lessons and a one-click iCal subscription link
- CRUD for families, students, availability windows, recurring assignments, and blackout dates
- Auto-generated lessons on a rolling 12-week horizon (idempotent — re-running never duplicates)
- Lessons skip blackout periods automatically
- Full lesson history with late-cancel flags highlighted

**Parents**
- Magic-link sign-in (no password)
- View all upcoming lessons for every child in the family
- Cancel any lesson with a required note
- Late cancellations (within 24 hours) are allowed but flagged — teacher receives an email with a warning subject line

**Notifications**
- Teacher receives an email on every cancellation via Resend
- Late-cancel emails have a distinct subject (`⚠ LATE CANCEL`) for easy filtering

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions) |
| Database + Auth | Supabase (Postgres + magic-link) |
| Styling | Tailwind CSS |
| Email | Resend |
| Deployment | Vercel (hobby tier) |
| Package manager | pnpm |

## Local Development

**Prerequisites:** Node 18+, pnpm, Docker (for Supabase local), [Supabase CLI](https://supabase.com/docs/guides/cli)

```bash
git clone https://github.com/margauxxhu/cadence
cd cadence
pnpm install

# Start local Supabase (Postgres + Auth + Studio)
supabase start

# Apply schema
supabase db reset

# Generate TypeScript types from local schema
supabase gen types typescript --local > types/supabase.ts

# Copy env template and fill in values from `supabase start` output
cp .env.example .env.local
```

Then start the dev server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (cron + iCal routes only) |
| `RESEND_API_KEY` | Resend API key for cancellation emails |
| `TEACHER_EMAIL` | Where cancellation emails are sent |
| `CRON_SECRET` | Shared secret for the lesson-generator cron endpoint |
| `CANCEL_CUTOFF_HOURS` | Hours before a lesson at which a cancel is flagged as late (default: 24) |

## One-Time Setup After First Login

After signing in as the teacher for the first time, register your user ID in the database:

```sql
-- Run in Supabase Studio or SQL editor
UPDATE teacher_settings
SET teacher_uid = '<your auth.users id>'
WHERE id = 1;
```

## Architecture Notes

- Server Components by default; client components only where interactivity is required
- Server Actions for all mutations
- Times stored as UTC, displayed in `America/Los_Angeles` via a single `formatLessonTime()` helper
- Row Level Security enforced at the database layer — parents can only read and update their own family's lessons
- Lesson generator is idempotent: a unique partial index on `(student_id, scheduled_at) WHERE status = 'scheduled'` prevents duplicate rows even under concurrent runs
