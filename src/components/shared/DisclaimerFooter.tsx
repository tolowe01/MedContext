import Link from 'next/link'

export default function DisclaimerFooter() {
  return (
    <footer className="w-full border-t border-dialogue-border bg-dialogue-surface px-4 py-4">
      <p className="text-xs font-body text-dialogue-textMuted text-center leading-relaxed">
        MedContext is a monitoring aid, not a medical device. All clinical decisions are made by a
        licensed pharmacist.{' '}
        <Link
          href="/legal/privacy"
          className="text-dialogue-accent underline underline-offset-2 rounded-sm hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dialogue-accent"
        >
          Privacy policy
        </Link>
      </p>
      <p className="mt-1 text-xs font-body text-dialogue-textMuted text-center">
        Français disponible bientôt · Protected under Québec Law 25
      </p>
    </footer>
  )
}
