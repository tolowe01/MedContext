export default function Loading() {
  return (
    <main className="min-h-screen bg-mc-surface-page px-screenX flex items-center justify-center">
      <span
        className="w-6 h-6 border-2 border-mc-primary-400 border-t-transparent rounded-full animate-spin"
        aria-label="Loading"
        role="status"
      />
    </main>
  )
}
