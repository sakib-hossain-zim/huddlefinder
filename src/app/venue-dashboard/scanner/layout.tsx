export default function ScannerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // ── Fullscreen overlay — hides navbar completely ──────
  // Scanner is a focused tool, staff only needs camera + ticket UI
  // "← Dashboard" button in scanner handles navigation back
  return (
    <div className="fixed inset-0 z-50 bg-gray-900 overflow-hidden">
      {children}
    </div>
  )
}