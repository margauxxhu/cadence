# Cadence

Scheduling software built around how recurring lessons actually work — not how booking tools assume they do.

---

## Why this exists

A seasoned piano teacher with 30+ students was still managing her schedule through text messages. Not because she hadn't tried the alternatives — she had. Calendly, Acuity, and their peers are built around one-off appointments. Piano lessons don't work that way.

Every student holds the same slot every week for an entire semester. The real overhead isn't scheduling — it's the exceptions: the sick kid, the holiday week, the last-minute reschedule. No freemium tool handles that elegantly without charging for features she'll never use or forcing parents through an onboarding flow they'll abandon.

Cadence was built for her. It does exactly what she needs and nothing she doesn't. The code is open-source so any independent teacher, trainer, or tutor can deploy their own instance.

---

## Features

**Teacher**
- **Roster-first:** Lessons auto-generate from each student's fixed weekly slot. Set the template once; Cadence maintains a rolling 12-week calendar automatically.
- **Availability periods:** Define working windows by semester with day-level granularity. Layer exceptions (full-day or partial time blocks) on top without restructuring anything.
- **Blackout dates:** Mark a holiday or vacation once; all overlapping lessons are excluded from generation.
- **Pending approvals:** Trial requests from new students surface in the dashboard for one-click approve or decline — with an email sent to the parent either way.
- **iCal feed:** Subscribe once via a private URL; lessons appear natively in Apple Calendar. No separate dashboard to check.
- **Lesson history:** Full audit trail of every lesson — scheduled, cancelled, rescheduled, completed — with late-cancel flags surfaced.

**Parents**
- **Magic-link sign-in:** No password, no app to install. One email, one tap.
- **Invite-only access:** Only families the teacher has registered can sign in. No open self-signup.
- **Cancel:** Cancel any lesson with a required note. Late cancellations (within 24 hours) are allowed but flagged — no hidden friction, full transparency.
- **Reschedule:** Pick a new slot from a live mini-calendar showing real availability, not a static list.
- **Add a lesson:** Book an extra slot for an existing student (confirmed immediately) or request a trial for a new student (pending teacher approval).
- **Conflict alerts:** If the teacher adds an exception after a lesson was already generated, an amber warning prompts the parent to reschedule.

**Notifications**
- **Cancellation email:** Teacher receives an instant alert on every cancel; late cancellations arrive with a distinct subject line for easy filtering.
- **Reschedule email:** Teacher sees the original time, new time, and the parent's note — in one email.
- **Approval email:** Parent receives a confirmation or decline the moment the teacher acts.

---

## How it fits together

```
Teacher (browser)                         Parent (email → browser)
       │                                           │
       │ email + password                          │ magic link
       ▼                                           ▼
┌────────────────────────────────────────────────────────────┐
│                     Next.js  ·  Vercel                      │
│                                                            │
│  /dashboard   /families   /availability                    │
│  /assignments /lessons    /blackouts      /my-lessons      │
│                                                            │
│  /api/ical/[token] ─────────────────────────────────────── ▶ Apple Calendar
│  /api/cron/generate-lessons ◄── Vercel Cron (daily 6am)    │
└──────────────────────────┬─────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
       ┌─────────────┐           ┌────────────┐
       │  Supabase   │           │   Resend   │
       │  Postgres   │           │            │
       │  + Auth     │           │ ──▶ teacher email
       │  + RLS      │           │ ──▶ parent email
       └─────────────┘           └────────────┘
```

**Key decisions**

- **Server Components by default.** Client components only where interactivity is required.
- **Server Actions for all mutations.** No separate API layer for writes.
- **UTC storage, Pacific display.** All timestamps stored in UTC; a single `formatLessonTime()` helper handles display in `America/Los_Angeles`.
- **RLS at the database layer.** Parents can only read and modify their own family's records — enforced in Postgres, not just the application.
- **Idempotent lesson generation.** A unique partial index on `(student_id, scheduled_at) WHERE status = 'scheduled'` prevents duplicates even if the cron fires twice.

---

## Self-hosting

Designed to run on free tiers. One teacher, one deployment.

### What you'll need

| Service | Purpose | Cost |
|---|---|---|
| [Supabase](https://supabase.com) | Database, auth, row-level security | Free |
| [Vercel](https://vercel.com) | Hosting + daily cron | Free |
| [Resend](https://resend.com) | Notification emails | Free up to 3,000/mo |
| A custom domain | Verified sender for Resend (production only) | ~$10–15/yr |

> Without a verified sender domain, Resend can only deliver to the account owner's email. For local testing or a setup where the teacher's email matches the Resend account, this is sufficient. Sending notifications to parent emails requires a verified domain.

### Setup steps

1. Fork this repo and connect it to Vercel via GitHub
2. Create a Supabase project and run the migrations in `supabase/migrations/` via the SQL editor
3. Copy `.env.example` and set all values as Vercel environment variables
4. Sign in as the teacher, then register your account in the database:
   ```sql
   UPDATE teacher_settings SET teacher_uid = '<your auth.users id>' WHERE id = 1;
   ```
5. Add your first family from the teacher dashboard — magic-link access is invite-only from here

### Environment variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side only) |
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM` | Verified sender, e.g. `Cadence <hello@yourdomain.com>` |
| `TEACHER_EMAIL` | Where teacher notifications are delivered |
| `NEXT_PUBLIC_APP_URL` | Your deployment URL, e.g. `https://cadence.yourdomain.com` |
| `CRON_SECRET` | Random secret to authenticate the lesson-generation cron endpoint |
| `CANCEL_CUTOFF_HOURS` | Hours before a lesson at which a cancellation is flagged as late (default: 24) |

---

## Local development

**Prerequisites:** Node 18+, pnpm, Docker, [Supabase CLI](https://supabase.com/docs/guides/cli)

```bash
git clone https://github.com/margauxxhu/cadence
cd cadence
pnpm install

# Start local Supabase (Postgres + Auth + Studio)
supabase start

# Apply schema
supabase db reset

# Generate TypeScript types
supabase gen types typescript --local > types/supabase.ts

# Copy env and fill in values from `supabase start` output
cp .env.example .env.local

pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions) |
| Database + Auth | Supabase (Postgres + magic-link) |
| Styling | Tailwind CSS v4 |
| Email | Resend |
| Deployment | Vercel |
| Package manager | pnpm |
