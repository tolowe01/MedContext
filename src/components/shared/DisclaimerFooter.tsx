import Link from 'next/link'

export default function DisclaimerFooter() {
  return (
    <footer className="w-full border-t border-mc-neutral-200 bg-mc-neutral-100 px-4 py-4">
      <p className="text-xs font-body text-mc-neutral-600 text-center leading-relaxed">
        MedContext is a monitoring aid, not a medical device. All clinical decisions are made by a
        licensed pharmacist.{' '}
        <Link
          href="/legal/privacy"
          className="text-mc-primary-400 underline underline-offset-2 rounded-sm hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-primary-200"
        >
          Privacy policy
        </Link>
      </p>
      <p className="mt-1 text-xs font-body text-mc-neutral-600 text-center">
        Français disponible bientôt · Protected under Québec Law 25
      </p>
    </footer>
  )
}
