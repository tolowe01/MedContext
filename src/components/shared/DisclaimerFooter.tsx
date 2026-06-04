export default function DisclaimerFooter() {
  return (
    <footer className="w-full border-t border-dialogue-border bg-dialogue-surface px-4 py-4">
      <p className="text-xs font-body text-dialogue-textMuted text-center leading-relaxed">
        MedContext is a monitoring aid, not a medical device. All clinical decisions are made by a
        licensed pharmacist.{' '}
        <a
          href="https://medcontext.ca/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-dialogue-accent underline underline-offset-2 hover:opacity-80"
        >
          Privacy policy
        </a>
      </p>
    </footer>
  )
}
