# MedContext, Project Roadmap

> **MedContext** is the cardiovascular context layer between patient and pharmacist. Quebec's Bill 31 (2020) and Bill 67 (2024) now legally authorize pharmacists to assess, adjust, and stop a patient's drug therapy. The legal authority is there. The data is not. Pharmacists titrate on a 10-minute counter conversation with one blood pressure reading, then sign their name to a dose change they are liable for. MedContext gives them 7 days of patient-tracked blood pressure and medication adherence through a text-or-voice chatbot, then a triaged dashboard for review. Human in the loop, always.

---

## Table of Contents

1. [Architecture](#1-architecture)
2. [Quebec Legal Foundation](#2-quebec-legal-foundation)
3. [Data Flow](#3-data-flow)
4. [Data Structures](#4-data-structures)
5. [Deliverables and Implementation Steps](#5-deliverables-and-implementation-steps)
6. [Technical Implementation Details](#6-technical-implementation-details)
7. [Demo Flow (1 minute inside a 3 minute pitch)](#7-demo-flow)
8. [Success Criteria](#8-success-criteria)
9. [Phase 2, Everything Aspirational](#9-phase-2-everything-aspirational)
10. [Citations and System Prompts](#10-citations-and-system-prompts)

---

## 1. Architecture

### Pattern: Next.js App Router, Server Components, Supabase, Realtime

**Why this stack**: One repo serves both patient and pharmacist UIs under route groups, so the demo runs from a single dev server with two browser windows logged in as different roles. Supabase Realtime carries the patient submission and the pharmacist intervention live across both windows, which is the hero moment. Row Level Security isolates patient data without a separate auth service.

### Layer Breakdown

| Layer | Role | Technology |
|-------|------|------------|
| **App routes** | Two route groups: `(patient)` and `(pharmacist)`, plus `(auth)` | Next.js 15 App Router |
| **Server actions** | Form submission, intervention triggers, weekly submission | Next.js Server Actions |
| **API routes** | Streaming Claude, ElevenLabs Scribe (STT), ElevenLabs TTS | Next.js Route Handlers |
| **Database** | Postgres with Row Level Security | Supabase |
| **Realtime sync** | Patient submission to pharmacist dashboard, intervention to patient screen | Supabase Realtime |
| **Auth** | Email plus access code gating, seeded demo accounts | Supabase Auth |
| **Storage** | Consent receipts (Phase 1 if time, Phase 2 otherwise) | Supabase Storage |
| **AI intake** | Voice in, voice out optional, text always, structured extraction | Claude Sonnet 4.5, ElevenLabs Scribe, ElevenLabs TTS |
| **Animation** | Pharmacist avatar at onboarding and after submission | Lottie (lottie-react) |

### Project Structure

```
medcontext/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (patient)/
│   │   ├── onboarding/
│   │   │   ├── consent/page.tsx           ← Law 25 explicit consent, plain language
│   │   │   ├── disclaimers/page.tsx       ← AI not a doctor, emergency protocol
│   │   │   ├── questionnaire/page.tsx     ← Schema-driven, easy to update later
│   │   │   └── complete/page.tsx          ← Lottie pharmacist welcomes
│   │   ├── tracking/page.tsx              ← Daily intake (text primary, voice optional)
│   │   ├── progress/page.tsx              ← Streak, timeline, consistency
│   │   ├── submit/page.tsx                ← Weekly submission
│   │   └── review/page.tsx                ← Pharmacist decision (Realtime)
│   ├── (pharmacist)/
│   │   ├── dashboard/page.tsx             ← Triage list with flags + sparklines
│   │   └── patient/[id]/page.tsx          ← Patient detail with AI synthesis
│   ├── api/
│   │   ├── chat/route.ts                  ← Claude streaming with tool use
│   │   ├── stt/route.ts                   ← ElevenLabs Scribe proxy
│   │   └── tts/route.ts                   ← ElevenLabs TTS proxy
│   ├── layout.tsx                         ← Global emergency banner persists
│   └── globals.css
├── components/
│   ├── ui/                                ← shadcn primitives
│   ├── patient/
│   │   ├── ChatIntake.tsx                 ← Text-first chatbot with voice option
│   │   ├── VoiceInputButton.tsx           ← Push-to-talk, optional
│   │   ├── StreakBadge.tsx
│   │   ├── DataEntryTimeline.tsx
│   │   ├── ConsistencyScore.tsx
│   │   └── DynamicQuestionnaire.tsx       ← Renders from schema
│   ├── pharmacist/
│   │   ├── PatientTriageList.tsx
│   │   ├── TrendSparkline.tsx             ← 7-day BP mini chart (recharts)
│   │   ├── AISynthesisPanel.tsx
│   │   ├── VerifiedReadingForm.tsx
│   │   ├── ComparisonView.tsx
│   │   └── InterventionPanel.tsx
│   └── shared/
│       ├── LottiePharmacist.tsx
│       ├── EmergencyBanner.tsx
│       └── DisclaimerFooter.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── anthropic.ts
│   ├── elevenlabs.ts
│   ├── flags.ts                           ← BP and adherence flagging rules
│   ├── questionnaire-schema.ts            ← Single source of truth, edit to update form
│   └── seed.ts
├── prompts/
│   ├── intake-system.ts
│   └── synthesis-system.ts
├── public/lottie/pharmacist.json
├── supabase/
│   ├── migrations/0001_initial.sql
│   └── seed.sql
├── middleware.ts                          ← Route protection by role
└── tailwind.config.ts
```

---

## 2. Quebec Legal Foundation

This is not background reading. It is the pitch. The app is timely because the law just changed.

### 2.1 Pharmacist authority to titrate (the why-now)

- **Bill 31 (2020, c. 4)** amended the Pharmacy Act (CQLR c P-10). Pharmacists can now prescribe following a consultation request from a prescriber and assess the physical condition of a person to ensure proper medication use.
- **Bill 67 (2024)** further expanded the role. The Règlement sur l'amorce et la modification d'une thérapie médicamenteuse explicitly authorizes pharmacists to **assess, adjust, and stop a patient's drug therapy** and to substitute medications under defined conditions.
- **Implication**: A physician writing a hypertension prescription with "pharmacist to titrate" is now common and legally backed. MedContext is the missing data layer that makes safe titration possible.

### 2.2 Law 25 (formerly Bill 64) requirements that apply to us

The Act respecting the protection of personal information in the private sector (ARPPIPS), modernized by Law 25. All provisions in force since September 2024. Enforced by the **Commission d'accès à l'information du Québec (CAI)**.

Concrete requirements baked into the app:

1. **Explicit, granular consent** before any collection. Stored with timestamp, version, and purpose. Patient can withdraw consent at any time.
2. **Plain-language privacy policy** (Law 25 section 8.2). Drafted in clear, non-legalese French and English. Linked from every onboarding screen.
3. **Health data is sensitive personal information** under Law 25, requiring heightened protection. Encryption at rest (Supabase default) and TLS in transit. Field-level encryption for diagnosis and questionnaire data is Phase 2.
4. **Breach notification to the CAI and affected individuals** without delay if the breach poses a risk of serious injury. Operational runbook is Phase 2.
5. **Data Protection Officer**: by default the highest-ranking person in the org. For a hackathon, document who this is in README.
6. **Privacy Impact Assessment** (PIA) required for systems processing sensitive personal information through technology. Document a one-page PIA in the repo (Phase 1 deliverable).
7. **Right of access, correction, portability, and deletion**: the dashboard surfaces these for the patient (Phase 2 for full implementation, Phase 1 just adds a "Request my data" link to a form).

### 2.3 French language (Bill 96, Charter of the French Language)

Quebec consumer-facing software must be available in French. Phase 1 ships English-only for the hackathon demo with a visible "Français disponible bientôt" notice. Phase 2 ships a full French translation. Mention this in the pitch so judges know it is on the roadmap, not forgotten.

### 2.4 What MedContext is NOT (to stay inside the lines)

- Not a medical device. No diagnosis, no treatment recommendation, no risk score for the patient.
- Not a prescriber. All clinical decisions belong to the pharmacist.
- Not a substitute for emergency care. Emergency banner is persistent on every patient screen.
- Not a long-term records system. Phase 1 stores rolling 30 days. Long-term retention with audit log is Phase 2.

---

## 3. Data Flow

**Core principle**: Patient action triggers a Server Action or API route, writes to Postgres, broadcasts via Supabase Realtime to the pharmacist window. Pharmacist intervention reverses the path.

### A. Onboarding (one time, ~3 min)

1. Patient lands on `/login`, signs in with seeded `patient@demo` account
2. Middleware checks role, redirects to `/onboarding/consent` if no consent record
3. Patient reads Law 25 consent in plain language. Lists every data category collected and its purpose. Clicks Accept. Server Action writes `consent_records` row with timestamp, version, and consent purpose set. If time allows in Phase 1, jsPDF generates a receipt and uploads to Supabase Storage. If not, this drops cleanly to Phase 2 with no UI change.
4. Patient advances to `/onboarding/disclaimers`. Three blocks acknowledged in sequence: "AI is not a healthcare professional," "Limitations of this tool," "Emergency, call 911." Each requires a checkbox before Continue enables. EmergencyBanner becomes persistent across every authenticated patient route.
5. Patient advances to `/onboarding/questionnaire`. The form is **rendered dynamically from `lib/questionnaire-schema.ts`**, so updating questions is a one-file change. Initial fields:
   - Current prescription meds (free text)
   - Meds from other pharmacies, OTC, natural supplements (free text)
   - Allergies (free text)
   - Smoking (none, cigarettes, cannabis, both)
   - Alcohol (none, occasional, weekly, daily)
   - Pregnancy or breastfeeding (yes, no, not applicable)
   - Family cardiovascular history (yes, no, unsure)
   - Past medical history (free text)
6. Submit writes a single jsonb blob to `patients.baseline_questionnaire`. Schema version is stored alongside the data so future questionnaire updates do not break old records.
7. Patient lands on `/onboarding/complete`. Lottie pharmacist plays. Copy: "Hi, I am your pharmacist's assistant. Each evening I will ask you for a blood pressure reading and whether you took your medication. You can type or speak. Your data is reviewed by a real licensed pharmacist."

### B. Daily Tracking (text-first, voice optional)

1. Patient arrives at `/tracking`. Server checks for today's `daily_logs` row. If yes, shows completion state with streak. If not, ChatIntake mounts.
2. **Text input is the primary interface and always works**. A text input field is visible at the bottom of the chat. The microphone button sits next to it as an optional second path. If ElevenLabs is unavailable or the user has no microphone permission, the experience degrades to text only with no broken UI.
3. First assistant message: "Good evening. Ready to log today's reading? You can type your numbers or hold the mic to speak."
4. Text path: user types "145 over 92, took my pill, no symptoms" and hits enter. Message posts to `/api/chat`.
5. Voice path: user holds VoiceInputButton, releases, audio blob POSTed to `/api/stt`, transcript returned, inserted as user message, then forwarded to `/api/chat` identically to the text path. Both paths converge at the same endpoint.
6. `/api/chat` streams Claude Sonnet 4.5 with `prompts/intake-system.ts`. Claude calls the `log_reading` tool when structured fields are extracted.
7. Confirmation card appears inline with extracted values. Confirm and Edit buttons. Confirm fires a Server Action that writes to `daily_logs`.
8. TTS playback of the closing line ("Thank you. See you tomorrow.") via `/api/tts` is **optional polish**. If TTS fails or is disabled, the closing line appears as text only.
9. Streak badge, timeline, and consistency score update.

### C. Weekly Submission

1. On day 7 (or for the demo, after the seeded 6 days plus today's entry), `/submit` is enabled
2. Patient clicks Submit Week. Server Action calls Claude with `synthesis-system.ts` and the 7 logs. Returns plain-text synthesis. Inserts row into `weekly_submissions` with `ai_synthesis_text` and `status='submitted'`. Triggers Supabase Realtime broadcast.
3. Patient redirects to `/review`, subscribes to Realtime for the matching `interventions` row.

### D. Pharmacist Review

1. Pharmacist window is on `/dashboard`. Realtime subscription catches the new submission, slides it into the Flagged section, plays a soft chime.
2. Click row, land on `/patient/[id]`. Four panels render:
   - Profile and questionnaire summary
   - Mocked Telus medication list with "Pulled from Telus Health" badge
   - 7-day TrendSparkline with reference lines at 140 and 90, adherence row below
   - AISynthesisPanel: editable textarea seeded with `ai_synthesis_text`. Edits saved to `ai_synthesis_edited_text`
3. VerifiedReadingForm: pharmacist enters their own in-store reading. Writes to `pharmacist_verified_readings`. ComparisonView shows patient vs pharmacist values and delta. If delta exceeds 10 mmHg, a "Significant variance, consider follow-up" hint appears (no automated decision, just a flag).
4. InterventionPanel: four options:
   - Approve and send positive message (Clinical Option A)
   - Schedule phone call (Clinical Option B)
   - Send clinical note (Clinical Option B)
   - Invite to in-person appointment (Clinical Option B)

### E. Realtime Sync

- Both windows subscribe to `weekly_submissions` and `interventions` scoped by RLS
- Supabase pushes any change to the patient window in under 500 ms
- Patient `/review` updates without refresh

### F. Patient Receives Decision

- Scenario A: big green check, positive copy, Tucker et al. 2017 citation badge
- Scenario B: intervention card matching the kind (phone time, note text, or appointment date)
- Browser Notification fires if the patient window is backgrounded

---

## 4. Data Structures

Postgres schema. RLS enabled on all tables.

```sql
create type user_role as enum ('patient', 'pharmacist');
create type submission_status as enum ('submitted', 'reviewed', 'follow_up');
create type intervention_kind as enum ('approval', 'phone_call', 'in_person', 'clinical_note');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null,
  pharmacy_id uuid,                          -- null for patients
  first_name text not null,
  last_name text not null,
  created_at timestamptz default now()
);

create table patients (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  pharmacy_id uuid not null,
  date_of_birth date not null,
  access_code text not null,
  diagnosis text default 'Hypertension',
  baseline_questionnaire jsonb,              -- shape defined by questionnaire-schema.ts
  questionnaire_schema_version text not null default 'v1.0',  -- for future migrations
  created_at timestamptz default now()
);

create table consent_records (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  consented_at timestamptz default now(),
  consent_version text not null default 'v1.0',
  purposes text[] not null,                  -- granular per Law 25
  pdf_url text,                              -- nullable, populated if Phase 1 PDF ships
  ip_address text
);

create table daily_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  log_date date not null,
  systolic int not null,
  diastolic int not null,
  heart_rate int,
  adherence_taken boolean not null,
  symptom_note text,
  entered_via text not null default 'text',  -- 'text' or 'voice'
  created_at timestamptz default now(),
  unique (patient_id, log_date)
);

create table pharmacist_verified_readings (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  pharmacist_id uuid references profiles(id),
  reading_date date not null,
  systolic int not null,
  diastolic int not null,
  recorded_at timestamptz default now()
);

create table weekly_submissions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  week_start date not null,
  ai_synthesis_text text,
  ai_synthesis_edited_text text,
  status submission_status default 'submitted',
  submitted_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references profiles(id)
);

create table interventions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references weekly_submissions(id) on delete cascade,
  kind intervention_kind not null,
  payload jsonb,                             -- phone_time, note_text, appointment_date
  created_at timestamptz default now()
);

alter publication supabase_realtime add table weekly_submissions;
alter publication supabase_realtime add table interventions;
alter publication supabase_realtime add table daily_logs;
```

### RLS policy pattern (apply to every table)

```sql
-- Patients see only their own rows
create policy "patients_own_rows" on daily_logs
  for select using (
    patient_id in (select id from patients where profile_id = auth.uid())
  );

-- Pharmacists see rows scoped to their pharmacy
create policy "pharmacist_pharmacy_rows" on daily_logs
  for select using (
    patient_id in (
      select id from patients
      where pharmacy_id = (select pharmacy_id from profiles where id = auth.uid())
    )
  );
```

### Questionnaire schema (lib/questionnaire-schema.ts)

```ts
export const QUESTIONNAIRE_SCHEMA_VERSION = 'v1.0';

export const questionnaireSchema = [
  { id: 'prescription_meds', label: 'Current prescription medications', kind: 'textarea' },
  { id: 'other_meds', label: 'OTC meds, supplements, meds from other pharmacies', kind: 'textarea' },
  { id: 'allergies', label: 'Known allergies', kind: 'textarea' },
  { id: 'smoking', label: 'Smoking', kind: 'select',
    options: ['none', 'cigarettes', 'cannabis', 'both'] },
  { id: 'alcohol', label: 'Alcohol consumption', kind: 'select',
    options: ['none', 'occasional', 'weekly', 'daily'] },
  { id: 'pregnancy', label: 'Pregnancy or breastfeeding', kind: 'select',
    options: ['yes', 'no', 'not_applicable'] },
  { id: 'family_cvd', label: 'Family history of cardiovascular disease', kind: 'select',
    options: ['yes', 'no', 'unsure'] },
  { id: 'past_medical', label: 'Past medical history', kind: 'textarea' }
] as const;
```

To change the questionnaire later: edit this file, bump `QUESTIONNAIRE_SCHEMA_VERSION`. The form re-renders automatically. Old records keep their original schema version for backwards compatibility.

### Seed Data (for demo)

```
patient@demo (Sophie Tremblay, 58, hypertension)
  Day -6: 135/85, adherent, no symptoms
  Day -5: 138/87, adherent, no symptoms
  Day -4: 142/90, adherent, no symptoms      ← edges into flag zone
  Day -3: 148/94, NOT adherent, "felt dizzy" ← flagged
  Day -2: 144/91, adherent
  Day -1: 146/93, adherent
  Day 0:  entered live in demo (target ~145/92, adherent)

pharmacist@demo (Sarah Chen, Pharmacy McGill)
  One verified reading: Day -3, 152/96 (in-store, 4 mmHg above patient self-report)
```

Flag rules (`lib/flags.ts`):
- Avg systolic > 140 OR avg diastolic > 90 → flagged
- Any single reading > 160/100 → flagged
- Adherence < 80% → flagged
- Missing days > 1 → flagged

---

## 5. Deliverables and Implementation Steps

### Phase 1, Hackathon MVP (24 hours, solo)

**Goal**: End-to-end patient submits and pharmacist reviews. Realtime sync visible across two windows. Text chatbot works reliably. Voice works as polish. Lottie at the two named moments. Demo runs in 60 seconds.

**Time budget (24 hours)**:
- Hours 0 to 4: setup, schema, auth, seed data
- Hours 4 to 9: patient flow (onboarding through tracking, text only)
- Hours 9 to 14: pharmacist flow (dashboard, detail, interventions)
- Hours 14 to 17: Realtime sync, end-to-end test
- Hours 17 to 20: voice intake (ElevenLabs Scribe), TTS if time permits
- Hours 20 to 22: Lottie, polish, seed verification
- Hours 22 to 24: bug fixes, backup recording, sleep

**Hard rule**: Voice is the LAST thing added. If hour 17 arrives and core flow is broken, voice is cut. Text intake plus working Realtime sync wins more judge points than voice with bugs.

#### 5.1 Project Setup

- **5.1.1** `npx create-next-app@latest medcontext --typescript --tailwind --app`
- **5.1.2** Install shadcn primitives: button, card, input, textarea, dialog, sheet, badge, tabs, toast, form, select, checkbox
- **5.1.3** Install deps: `npm i @supabase/supabase-js @supabase/ssr @anthropic-ai/sdk lottie-react recharts zod react-hook-form @hookform/resolvers date-fns`
- **5.1.4** Create Supabase project. Copy URL and anon key into `.env.local`
- **5.1.5** Add `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `SUPABASE_SERVICE_ROLE_KEY`
- **5.1.6** Set up Supabase clients in `lib/supabase/{client,server,middleware}.ts` per official Next.js App Router docs
- **5.1.7** Brand theme in `tailwind.config.ts`: muted teal primary, navy text, cream background, alert red reserved for emergency banner
- **5.1.8** `middleware.ts` redirects unauthenticated users to `/login` and routes authenticated by role

#### 5.2 Database and Seed

- **5.2.1** Paste schema into `supabase/migrations/0001_initial.sql`. Run migration
- **5.2.2** Enable RLS on all tables. Apply policy pairs
- **5.2.3** Enable Realtime on `weekly_submissions`, `interventions`, `daily_logs`
- **5.2.4** Write `lib/seed.ts`. Run with `npx tsx lib/seed.ts`. Creates demo accounts and 6 days of logs per section 4
- **5.2.5** Verify seed by logging in as both roles. Confirm RLS blocks cross-role reads

#### 5.3 Auth and Routing

- **5.3.1** `/login`: email and password form, shadcn Form + zod
- **5.3.2** Role-based redirect after login: patient to `/tracking` (or `/onboarding/consent` if no consent record), pharmacist to `/dashboard`
- **5.3.3** Persistent `EmergencyBanner` and `DisclaimerFooter` in `(patient)` layout
- **5.3.4** Privacy policy link in footer pointing to `/legal/privacy` (static page, plain language, lists every data category and purpose per Law 25)

#### 5.4 Patient Onboarding

- **5.4.1** `/onboarding/consent`: render Law 25 consent text in plain language. List each data category (BP readings, adherence, baseline questionnaire) with explicit purpose (pharmacist clinical review). Scroll-to-bottom requirement before Accept enables. Server Action writes `consent_records` with `purposes` array
- **5.4.2** `/onboarding/disclaimers`: three stacked cards, each requires checkbox. AI not a doctor, limitations, emergency = call 911
- **5.4.3** `/onboarding/questionnaire`: `DynamicQuestionnaire` component reads `questionnaireSchema` and renders the form. Submit writes jsonb to `patients.baseline_questionnaire` with `questionnaire_schema_version` set to current
- **5.4.4** `/onboarding/complete`: LottiePharmacist plays. Welcoming copy. Continue routes to `/tracking`
- **5.4.5** For the live demo, seed patient is pre-onboarded. Onboarding remains walkable for judge questions and a screenshot in the pitch

#### 5.5 Patient Daily Tracking, Text First

- **5.5.1** `/tracking`: server-side check for today's log. Render completion state OR mount ChatIntake
- **5.5.2** ChatIntake state: messages array, partial extraction state, input mode (text default, voice optional)
- **5.5.3** First assistant message rendered on mount
- **5.5.4** Text input visible at the bottom always. Enter to send. POSTs to `/api/chat`
- **5.5.5** `/api/chat`: streams Claude Sonnet 4.5 with `prompts/intake-system.ts` system prompt. Tool: `log_reading({systolic, diastolic, heart_rate?, adherence_taken, symptom_note?})`
- **5.5.6** Stream tokens to client via SSE. Watch for `tool_use` blocks. On `content_block_stop`, parse the structured input and render inline confirmation card
- **5.5.7** Confirmation card with Confirm and Edit. Confirm fires Server Action that writes `daily_logs`. `entered_via` reflects which path the user took
- **5.5.8** Post-confirmation: completion state renders, streak and timeline update

#### 5.6 Patient Voice Intake (polish layer)

- **5.6.1** VoiceInputButton mounts next to text input. Holds to record using `MediaRecorder`. On release, POST blob to `/api/stt`
- **5.6.2** `/api/stt`: proxy to ElevenLabs Scribe with `model_id: 'scribe_v1'`. Return transcript. Client inserts as user message and posts to `/api/chat`
- **5.6.3** Optional TTS: after Confirm, play the closing line via `/api/tts`. If TTS fails or env var missing, log silently and render text only. **This must never block the core flow.**
- **5.6.4** Permission denied or no mic: VoiceInputButton hides cleanly, text continues to work

#### 5.7 Patient Progress Surface

- **5.7.1** DataEntryTimeline: 7 dots, one per day. Filled if logged
- **5.7.2** StreakBadge: 3-day "Steady", 7-day "Week complete". No points, no levels
- **5.7.3** ConsistencyScore: completion rate with tooltip "This score reflects how often you log, not your health"
- **5.7.4** Submit Week button enabled after 7 days complete

#### 5.8 Patient Weekly Submission and Review

- **5.8.1** `/submit`: shows week summary. Submit fires Server Action
- **5.8.2** Server Action: call Claude with `synthesis-system.ts` and 7 logs. Get plain-text synthesis. Insert `weekly_submissions` row. Redirect to `/review`
- **5.8.3** `/review`: shows turnaround message. Lottie plays once. Realtime subscription on `interventions` filtered by `submission_id`
- **5.8.4** On intervention insert, render the matching card (approval, phone_call, clinical_note, in_person)
- **5.8.5** Request Notification permission on `/onboarding/complete` continue. Fire `new Notification(...)` when intervention arrives if document is hidden

#### 5.9 Pharmacist Dashboard

- **5.9.1** `/dashboard`: server-side fetch of `weekly_submissions` with status `submitted` for pharmacist's pharmacy. Join patient name and latest readings
- **5.9.2** Compute flag status per submission with `lib/flags.ts`
- **5.9.3** PatientTriageList: Flagged section above Stable. Each row: name, age, mini stat, flag chips, inline TrendSparkline
- **5.9.4** TrendSparkline: recharts LineChart, 7 points, 80x24 px, no axes, dots colored by threshold
- **5.9.5** Realtime subscription: new submission slides in, soft chime

#### 5.10 Pharmacist Patient Detail

- **5.10.1** `/patient/[id]` header: name, age, diagnosis, allergies as chips. "Pulled from Telus Health" badge above mocked medication list
- **5.10.2** Four-panel grid: Profile/questionnaire, AISynthesisPanel (editable), Mocked Telus list, Full TrendSparkline with reference lines at 140 and 90
- **5.10.3** VerifiedReadingForm writes to `pharmacist_verified_readings`
- **5.10.4** ComparisonView appears when both patient and pharmacist readings exist for any day. Shows delta. Variance hint at >10 mmHg
- **5.10.5** InterventionPanel: 4 buttons (Approve, Phone, Note, In-person). Each opens a sheet. Submit writes `interventions` row, updates `weekly_submissions.status`

#### 5.11 Lottie

- **5.11.1** Download free pharmacist/doctor character from LottieFiles
- **5.11.2** `LottiePharmacist` wrapper using `lottie-react`
- **5.11.3** Use ONLY on `/onboarding/complete` (idle wave loop) and `/review` scenario A (one-shot)
- **5.11.4** Never during `/tracking` (chatbot stays clinical)

#### 5.12 Demo Polish

- **5.12.1** Demo reset Server Action behind env flag. Restores seed state for retries
- **5.12.2** Walk through full demo, time it. Target under 90 seconds
- **5.12.3** Record backup screen capture
- **5.12.4** Pre-grant notification permission on patient window
- **5.12.5** Pre-position both browser windows side by side

---

## 6. Technical Implementation Details

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
NEXT_PUBLIC_DEMO_MODE=true               # exposes the demo reset button
```

### Claude Streaming with Tool Use

- `client.messages.stream` with `messages` history and a single tool `log_reading`
- Tool `input_schema` matches the structured BP and adherence object
- On the client, listen for `content_block_start` with `type: 'tool_use'`, accumulate `input_json_delta` events, parse on `content_block_stop`
- Render the inline confirmation card. Do NOT auto-submit

### Voice Pipeline (graceful degradation)

```
text input  ────────────────►  /api/chat  ───►  Claude  ───►  daily_logs
                                  ▲
voice button → MediaRecorder ─► /api/stt → Scribe ─► transcript ─► /api/chat
                                                                          ▼
                                              /api/tts ← TTS line ←  confirmation
                                                  ▼
                                            <audio> element
```

If `/api/stt` or `/api/tts` is unavailable, the text path still completes the cycle.

### Flag Rules (lib/flags.ts pseudo)

```ts
export function flagSubmission(logs: DailyLog[]): Flag[] {
  const flags: Flag[] = [];
  const avgSys = avg(logs.map(l => l.systolic));
  const avgDia = avg(logs.map(l => l.diastolic));
  const adherence = logs.filter(l => l.adherence_taken).length / logs.length;
  const missing = 7 - logs.length;

  if (avgSys > 140 || avgDia > 90) flags.push({ kind: 'bp_avg', severity: 'medium' });
  if (logs.some(l => l.systolic > 160 || l.diastolic > 100))
    flags.push({ kind: 'bp_peak', severity: 'high' });
  if (adherence < 0.8) flags.push({ kind: 'adherence', severity: 'medium' });
  if (missing > 1) flags.push({ kind: 'missing_data', severity: 'low' });
  return flags;
}
```

### Mocked Telus Medication List

Hard-coded in `lib/seed.ts`, rendered with a "Pulled from Telus Health" badge.

```
Amlodipine 5 mg, once daily, morning
Hydrochlorothiazide 12.5 mg, once daily, morning
Ramipril 10 mg, once daily, evening
```

### Realtime Subscription

```ts
const channel = supabase
  .channel('patient-interventions')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'interventions',
    filter: `submission_id=eq.${submissionId}`
  }, (payload) => setIntervention(payload.new))
  .subscribe();
```

### Browser Notification API

```ts
if ('Notification' in window && Notification.permission === 'granted') {
  new Notification('Your pharmacist has reviewed your file', {
    body: 'Tap to see the next step'
  });
}
```

Permission requested on `/onboarding/complete` Continue.

---

## 7. Demo Flow

### 3-minute pitch structure

**0:00 to 0:30, the wedge**
> "Quebec's Bill 31 and Bill 67 just gave pharmacists the legal authority to adjust drug therapy. A physician writes 'pharmacist to titrate' on a hypertension prescription and walks away. The pharmacist is now legally on the hook for that dose change. The authority is there. The data is not. Pharmacists titrate today on a 10-minute counter conversation with one blood pressure reading. We give them 7 days of context."

**0:30 to 1:00, the principle**
> "MedContext is a text-or-voice chatbot that the patient uses at home each evening. The chatbot is intake only. It never interprets. It never says good or bad. Every reading is reviewed by a licensed pharmacist within 24 to 48 hours. Human in the loop, always."

**1:00 to 2:00, the live demo (two windows side by side)**

| Time | Patient (left) | Pharmacist (right) | Narration |
|------|---------------|---------------------|-----------|
| 1:00 | On `/tracking`. Types "145 over 92, took my pill, no symptoms" | Sits on `/dashboard` | "Sophie types her evening reading. Voice is available too, but text is the primary path so it always works." |
| 1:15 | Claude streams response, confirmation card appears with extracted values | Still on dashboard | "Claude extracts structured values via tool use. The chatbot confirms the numbers and thanks her. It never evaluates." |
| 1:25 | Taps Confirm. Streak hits 7 | | "Day 7 logged. Streak complete." |
| 1:30 | Taps Submit Week | New row slides into Flagged with a chime | "Realtime sync, under a second. Sarah sees the submission live." |
| 1:40 | | Clicks Sophie's row. Sees TrendSparkline, missed dose, dizzy note | "Sarah sees the 7-day trend. The missed dose midweek. The dizzy symptom." |
| 1:50 | | ComparisonView shows variance with Sarah's in-store reading | "Sarah's own in-store reading three days ago was 4 mmHg higher than Sophie's self-report. Both readings on the record. Audit trail intact." |
| 1:55 | | Clicks Schedule Phone Call, picks 2 PM tomorrow | "Sarah picks a follow-up." |
| 2:00 | Browser notification fires. Card appears with phone time and Accept | Status flips to Follow-up | "Sophie sees it instantly." |

**2:00 to 2:30, the credibility lap**
> "Three things judges should know. One: Law 25, explicit granular consent at onboarding, plain-language privacy policy, sensitive personal information protections, all live. Two: the chatbot system prompt forbids evaluative language. Verifiable. Three: every clinical decision is made by a licensed pharmacist, never by the AI."

**2:30 to 3:00, what next**
> "Cardiovascular kills 20 to 30 percent of North Americans. Hypertension is the most common chronic prescription. Phase 2 brings real Telus Health integration, French language (Bill 96), step counts from Apple Health, field-level encryption for sensitive data, and an audit log to satisfy CAI breach-reporting workflows. We are starting with hypertension because Bill 67 just made it legal and the mortality gap is the largest."

### Hero moments

1. Realtime submission slides into the dashboard (1:30). No refresh. This is the wow.
2. ComparisonView with patient vs pharmacist variance (1:50). Answers the "patients lie or measure wrong" objection before any judge can ask.
3. Quebec law angle (0:00 and 2:30). Almost no hackathon team will know about Bill 67. You will.

---

## 8. Success Criteria

**Patient flow**
- [ ] Login with seeded account
- [ ] Onboarding walks consent, disclaimers, questionnaire (rendered from schema), complete
- [ ] EmergencyBanner persists across patient routes
- [ ] Chatbot accepts text reliably
- [ ] Claude extracts structured BP and adherence via tool use
- [ ] Chatbot never produces evaluative language (manual end-to-end check)
- [ ] Streak, timeline, consistency score update
- [ ] Weekly submission generates AI synthesis and inserts to Postgres

**Pharmacist flow**
- [ ] Login with seeded account
- [ ] Dashboard categorizes by flag status
- [ ] TrendSparkline renders inline for each patient
- [ ] New submission arrives in under 1 second via Realtime
- [ ] Patient detail shows mocked Telus list with badge
- [ ] AI synthesis editable
- [ ] VerifiedReadingForm writes parallel reading
- [ ] ComparisonView shows delta when both exist
- [ ] Four intervention paths all write to `interventions`

**Voice (polish, can be cut)**
- [ ] ElevenLabs Scribe transcribes a held button into text
- [ ] Transcript flows through the same `/api/chat` endpoint as typed text
- [ ] TTS plays the closing line, or fails silently with no UI break

**Cross-window**
- [ ] Submission shows on pharmacist dashboard live
- [ ] Intervention shows on patient `/review` live
- [ ] Browser notification fires if patient window backgrounded

**Compliance**
- [ ] Law 25 consent text present, scroll-required, plain language
- [ ] Privacy policy linked from every authenticated patient screen
- [ ] Emergency banner persistent
- [ ] AI never produces medical evaluation (verified)
- [ ] Lottie only at onboarding complete and review success

**Demo**
- [ ] Full live demo under 90 seconds
- [ ] Backup screen recording exists
- [ ] Demo reset restores seed state

---

## 9. Phase 2, Everything Aspirational

Everything below is explicitly deferred. Do not start any of it until Phase 1 is shipped and demoed.

### Compliance hardening
- Field-level encryption (pgsodium) for diagnosis and questionnaire jsonb
- Audit log table tracking every read/write by a pharmacist
- Privacy Impact Assessment (PIA) document per CAI guidance
- Breach notification runbook
- Right of access, correction, portability, deletion implemented as patient-facing dashboard
- Data Protection Officer designation documented
- Quarterly access review for pharmacist accounts

### French language
- Full Quebec French translation (Bill 96 compliance)
- Language toggle in user profile
- French-tuned ElevenLabs voice
- Localized Claude prompts validated by a Quebec French speaker

### Integrations
- Real Telus Health Pharmacy API connection with credentials
- Write-back of intervention notes to Telus
- Apple Health and Google Fit step count import
- Real appointment booking via Outlook or Google Calendar
- SMS reminders via Twilio for patients without smartphones

### Notifications and engagement
- Real web push with service workers and VAPID
- iOS PWA install flow
- Mobile-native wrapper via Expo if browser limits are hit
- Smart reminders based on patient logging patterns

### Clinical features
- Multi-pharmacy support fully verified end to end
- Patient response loop (accept/decline intervention writes back to record)
- Pharmacist analytics: review time, intervention outcomes, patient adherence trends
- Anonymized cohort comparisons
- Symptom expansion beyond cardiovascular
- Voice-cloned pharmacist for the post-submission Lottie scene (consent-gated)

### Consent and receipts
- jsPDF consent receipt generation and storage (if not landed in Phase 1)
- Email delivery of receipt to patient
- Versioned consent history with one-click withdrawal

### Quality of Life enhancements
- Anonymized cohort outcome message ("Patients with similar profiles see X mmHg drop in 4 weeks")
- Weekly summary email or in-app
- Patient education modules linked to specific readings

---

## 10. Citations and System Prompts

### Tucker et al. 2017 (positive message anchor)

Tucker, K. L., Sheppard, J. P., Stevens, R., Bosworth, H. B., Bove, A., Bray, E. P., et al. (2017). Self-monitoring of blood pressure in hypertension: A systematic review and individual patient data meta-analysis. *PLOS Medicine*, 14(9), e1002389. Self-monitoring with co-interventions (such as pharmacist review) is associated with an average reduction of 3 to 5 mmHg in systolic BP at 12 months. Combined with adherence support, this translates to roughly a 10 percent reduction in stroke risk over the medium term.

Positive message copy:
> "Well done. Consistent at-home monitoring combined with pharmacist review is associated with better long-term cardiovascular outcomes in peer-reviewed studies. Keep it up. [citation]"

### Chatbot system prompt (prompts/intake-system.ts)

```
You are an intake assistant for MedContext, a blood pressure and medication adherence tracking tool reviewed by a licensed Quebec pharmacist within 24 to 48 hours.

Your job is strictly to collect:
- systolic blood pressure (integer)
- diastolic blood pressure (integer)
- heart rate (optional integer)
- whether the patient took their medication today (boolean)
- optional symptom note (free text)

Tone: warm, professional, clinical. Like a friendly pharmacy technician.

Hard rules (never violate):
- You are NOT a medical professional. You do not interpret values. Never say a reading is high, low, normal, good, bad, concerning, or anything evaluative.
- If the patient describes a severe symptom (chest pain, fainting, severe headache, difficulty breathing, slurred speech, sudden numbness), respond ONLY with: "Those symptoms can be serious. Please call 911 or go to your nearest emergency room. I cannot help with urgent medical issues."
- If asked for medical advice or interpretation, decline politely and state that a pharmacist will review the data.
- Once all required fields are gathered from the conversation, call the log_reading tool. Do not log without explicit user confirmation.
- After confirmation, thank the patient and tell them you will see them tomorrow.

Tool:
log_reading({systolic, diastolic, heart_rate?, adherence_taken, symptom_note?})
```

### Synthesis system prompt (prompts/synthesis-system.ts)

```
You are summarizing 7 days of self-reported blood pressure and medication adherence data for a licensed Quebec pharmacist who will review the patient's file.

Produce a short factual summary (4 to 6 sentences). Include:
- Average systolic and diastolic
- Adherence rate as a percentage
- Number of days with readings above 140/90
- Any symptom notes reported, quoted verbatim
- Missing days, if any

Do NOT diagnose, recommend dose changes, or suggest interventions. State the data, nothing more. The pharmacist makes all clinical decisions.
```

---

## Appendix: Naming Conventions

- Routes: kebab-case (`/onboarding/consent`)
- Components: PascalCase (`TrendSparkline`)
- Database: snake_case
- Env vars: SCREAMING_SNAKE_CASE
- Copy: clinical, calm, no exclamation marks except in the Scenario A reinforcement
