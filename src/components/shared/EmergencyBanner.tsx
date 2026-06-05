import { Phone } from 'lucide-react'

export default function EmergencyBanner() {
  return (
    <div
      role="alert"
      className="w-full bg-emergency px-4 py-2 flex items-center justify-center gap-2 sticky top-0 z-50"
    >
      <Phone className="h-3.5 w-3.5 text-white shrink-0" strokeWidth={2.5} aria-hidden="true" />
      <span className="text-white font-body-bold text-xs uppercase tracking-wide">
        Medical emergency?
      </span>
      <a
        href="tel:911"
        className="text-white font-body-bold text-xs underline underline-offset-2 rounded-sm hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-opacity"
      >
        Call 911
      </a>
    </div>
  )
}
