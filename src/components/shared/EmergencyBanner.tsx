export default function EmergencyBanner() {
  return (
    <div className="w-full bg-bg-emergency px-4 py-2 flex items-center justify-center gap-2">
      <span className="text-white font-body-bold text-xs uppercase tracking-wide">
        Emergency?
      </span>
      <a
        href="tel:911"
        className="text-white font-body-bold text-xs underline underline-offset-2 hover:opacity-80 transition-opacity"
      >
        Call 911
      </a>
    </div>
  )
}
