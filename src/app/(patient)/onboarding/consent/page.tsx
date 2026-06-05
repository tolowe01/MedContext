import { recordConsent } from '@/actions/consent'
import { Button } from '@/components/ui/button'

const CONSENT_PARAGRAPHS = [
  {
    heading: 'What we collect',
    body: 'We collect the blood pressure readings you enter each day (systolic, diastolic, and heart rate), whether you took your medication, any symptom notes you add, and the health questionnaire you fill out at the start. We also store the date and time of each entry.',
  },
  {
    heading: 'Why we collect it',
    body: 'Your pharmacist needs this data to review your cardiovascular health over time and provide personalised clinical guidance. Without it, meaningful remote monitoring is not possible.',
  },
  {
    heading: 'Who sees your data',
    body: 'Only your assigned licensed pharmacist and the MedContext platform team (for technical support) can access your records. Your data is never sold, shared with insurers, or used for advertising.',
  },
  {
    heading: 'How long we keep it',
    body: 'Your logs are retained on a rolling 30-day basis. After 30 days, individual daily entries are automatically deleted. Weekly submission summaries are kept for 12 months so your pharmacist can track trends.',
  },
  {
    heading: 'Your rights under Law 25 (Québec)',
    body: 'Under Québec\'s Act respecting the protection of personal information in the private sector (Law 25), you have the right to access your data, request corrections, withdraw consent at any time, and request deletion. To exercise any of these rights, contact your pharmacist or email privacy@medcontext.ca.',
  },
  {
    heading: 'Withdrawing consent',
    body: 'You can withdraw consent at any time by contacting your pharmacist. Withdrawal stops future data collection immediately. Data already collected is retained only as long as required for the services you have already received.',
  },
]

export default function ConsentPage() {
  return (
    <main className="min-h-screen bg-mc-surface-page px-screenX pt-screenTop pb-20">
      <h1 className="font-display-bold text-screenTitle text-mc-neutral-900 mb-2">
        Your data, your rights
      </h1>
      <p className="font-body text-body text-mc-neutral-400 mb-6">
        Please read this before continuing. We keep it plain — no legal jargon.
      </p>

      <div className="bg-mc-surface-white border border-mc-neutral-200 rounded-card overflow-hidden mb-6">
        <div className="overflow-y-auto max-h-[52vh] px-6 py-5 space-y-6">
          {CONSENT_PARAGRAPHS.map((section) => (
            <div key={section.heading}>
              <h2 className="font-display-semi text-sectionTitle text-mc-neutral-900 mb-1">
                {section.heading}
              </h2>
              <p className="font-body text-body text-mc-neutral-400 leading-relaxed">
                {section.body}
              </p>
            </div>
          ))}

          <div className="border-t border-mc-neutral-200 pt-5">
            <p className="font-body text-sm text-mc-neutral-400">
              For our full privacy policy, visit{' '}
              <a
                href="/legal/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-mc-primary-400 underline underline-offset-2"
              >
                our privacy policy
              </a>
              .
            </p>
          </div>
        </div>
      </div>

      <form action={recordConsent}>
        <Button
          type="submit"
          className="w-full bg-mc-primary-400 hover:bg-mc-primary-600 text-white font-cta text-cta rounded-button py-4 transition-opacity"
        >
          I agree — continue
        </Button>
      </form>

      <p className="text-center text-xs text-mc-neutral-400 font-body mt-4 px-4">
        By continuing you confirm you have read the above and consent to data collection as described.
      </p>
    </main>
  )
}
