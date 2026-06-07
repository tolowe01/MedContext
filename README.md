# MedX

Cardiovascular context layer between patient and pharmacist. Patients log blood
pressure, heart rate, and medication adherence at home (text or voice); a 7-day
period is synthesized (non-evaluative) and surfaced to a pharmacist on a triaged
dashboard for human-in-the-loop review, with a physician escalation path.

> Repo is named `MedContext` on GitHub; the product is branded **MedX** in the UI.

---

## Handoff quick answers

| Question | Answer |
|---|---|
| **Repo** | `git@github.com:tolowe01/MedContext.git` (or zip of this directory, minus `node_modules`/`.next`/`.env.local`) |
| **Branch** | `main` (current, has MedX brand + demo seeds). UI responsive/a11y work lives on `responsive-overhaul`, not yet merged — see Known issues. |
| **Stack** | Next.js 15.3 (App Router), React 19, TypeScript 5, Tailwind 3.4, Supabase JS |
| **Node** | 20 LTS recommended (Next 15 needs ≥18.18). Package manager: npm (uses `package-lock.json`). |
| **Port** | **3000 only** — Server Actions are locked to `localhost:3000` in `next.config.ts`. |
| **Required services** | Supabase project (Postgres + Auth + Realtime + Storage), Anthropic API. ElevenLabs optional (voice STT/TTS). |
| **Demo creds** | All passwords `demo1234`. See [Demo credentials](#demo-credentials). |
| **Sample data** | `npm run seed` (Sophie) + `npm run seed:francois` (Francois). See [Sample data](#sample-data). |

---

## 1. Prerequisites

- **Node 20 LTS** and npm.
- A **Supabase project** (hosted is fine — there is no local Supabase stack config in this repo). You need its URL, anon key, and service-role key.
- An **Anthropic API key** (chat intake, weekly synthesis, medication extraction).
- *(Optional)* an **ElevenLabs API key + voice id** for the voice input/output features. Core text flow works without it.

## 2. Install

```bash
npm install
```

## 3. Environment variables

Copy the example and fill in real values:

```bash
cp .env.local.example .env.local
```

`.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY=       # Supabase service-role key (server only — never ship to client)
ANTHROPIC_API_KEY=               # Claude API key
ELEVENLABS_API_KEY=              # optional — voice STT/TTS
ELEVENLABS_VOICE_ID=             # optional — TTS voice
NEXT_PUBLIC_DEMO_MODE=true       # enables the pharmacist "reset demo" action
```

The seed/reset scripts and the app refuse to run with missing or `placeholder`
values, so fill all required keys before seeding.

## 4. Database setup (migrations)

Migrations are plain SQL in [`supabase/migrations/`](supabase/migrations/),
applied **in order**. There is no `supabase/config.toml`, so apply them against
your hosted project via either:

- **Supabase SQL editor**: paste each file's contents in order (`0001` → `0005`), or
- **Supabase CLI** (if you link the project): `supabase db push`.

Order:
1. `0001_initial.sql` — profiles, patients, daily_logs, weekly_submissions, RLS
2. `0002_fix_rls_recursion.sql` — RLS helper functions
3. `0003_add_physician_role.sql` — physician role
4. `0004_pharmacist_flow.sql` — medication lists, monitoring periods, side effects, **critical-BP trigger**, realtime
5. `0005_medication_lists_storage.sql` — Storage bucket wiring for uploaded medication PDFs

> The critical-alert trigger fires when `systolic > 180 OR diastolic > 120`. Demo
> readings stay below that on purpose.

## 5. Seed demo data

```bash
npm run seed            # Sophie Tremblay narrative (normal variant)
SEED_VARIANT=critical npm run seed   # leaves Day 0 empty for a live critical demo
npm run seed:francois   # Francois Legault — elevated-but-stable, escalation-ready
```

Both seeds are **idempotent** (re-run safe) and create their auth users via the
service role with email pre-confirmed.

## 6. Run

```bash
npm run dev        # http://localhost:3000   (MUST be port 3000)
```

Build / start:

```bash
npm run build && npm start
```

Tests:

```bash
npm test           # vitest (unit)
npm run test:e2e   # playwright (needs the app running / configured)
```

---

## Demo credentials

All passwords: **`demo1234`**. These are fake `@demo` addresses (not real email),
created with email confirmation pre-set — log in with email + password directly.

| Email | Role | Name |
|---|---|---|
| `pharmacist@demo` | Pharmacist | Sarah Chen |
| `patient@demo` | Patient | Sophie Tremblay |
| `physician@demo` | Physician | Marc Lavoie |
| `francois@demo` | Patient | Francois Legault (70) |

## Sample data

**Sophie Tremblay** (`npm run seed`) — 6 historical days averaging ~142/90 with a
mid-week dizziness event + skipped dose, a submitted week, confirmed meds
(Ramipril `is_new`), and an in-store verified reading. `SEED_VARIANT=critical`
omits Day 0 so an operator can log a live `185/122` as `patient@demo` and watch
the pharmacist's realtime critical banner fire.

**Francois Legault** (`npm run seed:francois`) — 70 y/o, 7 days steady at **~160/95,
HR ~80, 100% adherent**. Flags **HIGH** (avg >140 + peak ≥160) so he lands at the
top of triage, but stays under the critical threshold — ideal for demoing the
**manual escalation** flow. Same pharmacy as Sarah Chen.

Both appear under `pharmacist@demo` → dashboard triage.

**Reset helpers:**
- `npm run reset` — deletes `patient@demo`'s log for *today* (re-do the daily check-in demo).
- In-app: a pharmacist can hit the "reset demo" server action when `NEXT_PUBLIC_DEMO_MODE=true` (clears submissions/interventions; re-run a seed to restore logs).

---

## Architecture

```
Browser (React 19 / Next App Router)
  ├─ (auth)        login, signup (access-code gated for patients)
  ├─ (patient)     home, tracking (daily check-in: text + voice), submit, review,
  │                progress, onboarding (questionnaire → consent → disclaimers)
  └─ (pharmacist)  dashboard (triage + realtime critical banner),
                   patient/[id] (history, synthesis, interventions, escalation)
        │
        ├─ Server Actions  ──►  Supabase (RLS) for patient-scoped writes
        ├─ Route handlers  ──►  /api/chat, /api/extract-medications (Anthropic),
        │                       /api/stt, /api/tts (ElevenLabs)
        └─ middleware.ts   ──►  Supabase session + role-based redirects
                                 (patient → /home, pharmacist → /dashboard)
```

- **Auth & data**: Supabase. Row-Level Security isolates each patient; pharmacists
  see only their pharmacy's patients; physicians get escalation-scoped reads.
  Service-role key is used **only** server-side (seeds, admin actions, AI routes).
- **AI**: Anthropic Claude — non-evaluative intake chat, weekly data synthesis
  (data-only, no diagnosis), and medication extraction from uploaded documents.
- **Realtime**: `critical_alerts` is published to Supabase Realtime; the pharmacist
  dashboard subscribes and renders an alert banner the moment a critical log lands.
- **Design system**: `mc-*` tokens in `tailwind.config.ts` + `src/app/globals.css`
  (fluid `clamp()` type/spacing).

Key directories:

| Path | What |
|---|---|
| `src/app/` | Routes (route groups: `(auth)`, `(patient)`, `(pharmacist)`), `api/`, `error.tsx`, `loading.tsx` |
| `src/components/` | `ui/` (Radix-based primitives), `patient/`, `pharmacist/`, `shared/` |
| `src/actions/` | Server Actions (check-in, submit week, onboarding, demo reset) |
| `src/lib/` | Supabase clients, types, flags, prompts, **seed scripts** |
| `supabase/migrations/` | SQL schema + RLS + triggers |

---

## Known issues & demo shortcuts

- **Port is fixed to 3000.** `next.config.ts` allows Server Actions only from
  `localhost:3000`. Running on another port breaks mutations — change
  `allowedOrigins` if you must.
- **Migrations are manual.** No local Supabase stack / `config.toml`; apply the
  SQL files in order against a hosted project before seeding.
- **Demo auth is fake email.** `*@demo` addresses are created via service role with
  confirmation pre-set; no real inboxes. `privacy@medx.ca` in legal copy is not a
  real mailbox.
- **ESLint not configured.** `npm run lint` launches Next's interactive setup
  prompt; skip it or configure if needed. `npx tsc --noEmit` and `npm run build`
  are clean.
- **Responsive/a11y work is unmerged.** Branch `responsive-overhaul` adds fluid
  layout, a mobile bottom-tab nav, 44px touch targets, contrast fixes, and
  error/loading boundaries — but on the **old `MedContext` brand strings**. `main`
  has the MedX rename + demo seeds. Pick one or merge before handoff.
- **ElevenLabs optional.** Without `ELEVENLABS_API_KEY`/`ELEVENLABS_VOICE_ID`, the
  `/api/stt` and `/api/tts` voice features fail; the text flow is unaffected.
- **Storage bucket** (migration `0005`) is only needed for *live* medication-PDF
  upload + extraction; the seeded demo data uses placeholder storage paths.
- A `Claude-Features` git submodule is present and may show as dirty — unrelated to
  running the app; ignore for the demo.

## Demo run order (fastest path)

```bash
npm install
cp .env.local.example .env.local      # fill in real keys
# apply supabase/migrations/0001..0005 in the Supabase SQL editor
npm run seed && npm run seed:francois
npm run dev                            # open http://localhost:3000
# log in as pharmacist@demo / demo1234 → dashboard shows Sophie + Francois
```
