import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy — MedContext',
}

const SECTIONS = [
  {
    heading: 'What we collect',
    body: 'Blood pressure readings you enter each day (systolic, diastolic, heart rate), whether you took your medication, any symptom notes you add, and the baseline health questionnaire you complete at onboarding. We also store the date and time of each entry.',
  },
  {
    heading: 'Why we collect it',
    body: 'Your licensed pharmacist uses this data to review your cardiovascular health over time and provide personalised clinical guidance. Without it, safe remote monitoring is not possible.',
  },
  {
    heading: 'Legal basis (Québec Law 25)',
    body: 'Health data is sensitive personal information under the Act respecting the protection of personal information in the private sector (Law 25). We collect it only with your explicit, granular consent, recorded with a timestamp, version, and stated purpose. You may withdraw consent at any time.',
  },
  {
    heading: 'Who sees your data',
    body: 'Only your assigned licensed pharmacist and the MedContext platform team (for technical support) can access your records. Row-Level Security isolates your data so no other patient or pharmacy can read it. Your data is never sold, shared with insurers, or used for advertising.',
  },
  {
    heading: 'How long we keep it',
    body: 'Daily logs are retained on a rolling 30-day basis. Weekly submission summaries are kept for 12 months so your pharmacist can track trends. Data is encrypted at rest and in transit.',
  },
  {
    heading: 'Your rights',
    body: 'Under Law 25 you have the right to access your data, request corrections, withdraw consent, and request deletion. To exercise any of these rights, contact your pharmacist or email privacy@medcontext.ca.',
  },
  {
    heading: 'Not a medical device',
    body: 'MedContext is an intake and tracking tool. It does not diagnose, treat, or make clinical decisions. All clinical decisions are made by a licensed Québec pharmacist. In an emergency, call 911.',
  },
]

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-mc-surface-page px-screenX pt-screenTop pb-20">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-display-bold text-screenTitle text-mc-neutral-900 mb-2">
          Privacy Policy
        </h1>
        <p className="font-body text-body text-mc-neutral-400 mb-8">
          Plain language. No legal jargon. Last updated 2026.
        </p>

        <div className="space-y-6">
          {SECTIONS.map((section) => (
            <section key={section.heading}>
              <h2 className="font-display-semi text-sectionTitle text-mc-neutral-900 mb-1">
                {section.heading}
              </h2>
              <p className="font-body text-body text-mc-neutral-400 leading-relaxed">
                {section.body}
              </p>
            </section>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-mc-neutral-200">
          <p className="font-body text-tab text-mc-neutral-400">
            Français disponible bientôt · Protected under Québec Law 25 (ARPPIPS)
          </p>
          <Link
            href="/login"
            className="inline-block mt-4 text-mc-primary-400 font-body text-body underline underline-offset-2"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  )
}
