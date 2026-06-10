'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import {
  ChevronLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserGroupIcon,
  TicketIcon,
  CalendarDaysIcon,
  ArrowPathIcon,
  CameraIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { clsx } from 'clsx'

type ScanState =
  | 'scanning'
  | 'loading'
  | 'found'
  | 'success'
  | 'error'

interface TicketData {
  ticketId:       string
  eventId:        string
  venueId:        string
  userName:       string
  userEmail:      string
  eventTitle:     string
  eventDate:      string
  quantity:       number
  checkedInCount: number
  checkedIn:      boolean
  checkedInAt:    any
  ticketPrice:    number
}

export default function ScannerPage() {
  const router            = useRouter()
  const { user, userDoc } = useAuth()

  const [scanState,   setScanState]   = useState<ScanState>('scanning')
  const [ticket,      setTicket]      = useState<TicketData | null>(null)
  const [errorMsg,    setErrorMsg]    = useState('')
  const [enteringNow, setEnteringNow] = useState(1)
  const [checkingIn,  setCheckingIn]  = useState(false)
  const [cameraError, setCameraError] = useState(false)
  const [venueId,     setVenueId]     = useState<string | null>(null)

  const hasScannedRef = useRef(false)

  useEffect(() => {
    if (userDoc?.venueId) setVenueId(userDoc.venueId)
  }, [userDoc])

  // ── Start camera ──────────────────────────────────────
  useEffect(() => {
    if (scanState !== 'scanning' || cameraError) return

    hasScannedRef.current = false
    let instance: any = null
    let isStopped     = false

    async function safeStop() {
      if (isStopped) return
      isStopped = true
      try { await instance?.stop() } catch {}
    }

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      const el = document.getElementById('qr-reader')
      if (!el) return

      instance = new Html5Qrcode('qr-reader')

      instance.start(
        { facingMode: 'environment' },
        { fps: 15 },
        (decodedText: string) => {
          if (hasScannedRef.current) return
          hasScannedRef.current = true
          safeStop().then(() => handleScan(decodedText))
        },
        () => {}
      ).catch((err: any) => {
        console.error('Camera start error:', err)
        setCameraError(true)
      })
    })

    return () => { safeStop() }
  }, [scanState, cameraError])

  // ── Look up ticket ────────────────────────────────────
  async function handleScan(ticketId: string) {
    setScanState('loading')
    try {
      // Use client SDK for read — no permissions issue on reads
      const { doc, getDoc } = await import('firebase/firestore')
      const { db }          = await import('@/lib/firebase')

      const snap = await getDoc(doc(db, 'tickets', ticketId))

      if (!snap.exists()) {
        setErrorMsg('Ticket not found. This QR code is not valid.')
        setScanState('error')
        return
      }

      const data = snap.data() as TicketData

      if (venueId && data.venueId !== venueId) {
        setErrorMsg('This ticket is for a different venue.')
        setScanState('error')
        return
      }

      const ticketResult: TicketData = {
        ticketId:       snap.id,
        eventId:        data.eventId,
        venueId:        data.venueId,
        userName:       data.userName       ?? 'Unknown',
        userEmail:      data.userEmail      ?? '',
        eventTitle:     data.eventTitle     ?? '',
        eventDate:      data.eventDate      ?? '',
        quantity:       data.quantity       ?? 1,
        checkedInCount: data.checkedInCount ?? 0,
        checkedIn:      data.checkedIn      ?? false,
        checkedInAt:    data.checkedInAt,
        ticketPrice:    data.ticketPrice    ?? 0,
      }

      setTicket(ticketResult)
      const remaining = ticketResult.quantity - ticketResult.checkedInCount
      setEnteringNow(Math.max(remaining, 1))
      setScanState('found')
    } catch (err) {
      console.error('Ticket lookup error:', err)
      setErrorMsg('Something went wrong. Please try again.')
      setScanState('error')
    }
  }

  // ── Check in via API ──────────────────────────────────
  async function handleCheckIn() {
    if (!ticket || !venueId || !user) return
    setCheckingIn(true)
    try {
      const res  = await fetch('/api/tickets/check-in', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          ticketId:   ticket.ticketId,
          venueId,
          userId:     user.uid,
          enteringNow,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Failed to check in. Please try again.')
        setScanState('error')
        return
      }
      setScanState('success')
    } catch (err) {
      console.error('Check-in error:', err)
      setErrorMsg('Something went wrong. Please try again.')
      setScanState('error')
    } finally {
      setCheckingIn(false)
    }
  }

  function handleScanAnother() {
    setTicket(null)
    setErrorMsg('')
    setEnteringNow(1)
    setScanState('scanning')
  }

  if (!userDoc?.venueId) {
    return (
      <div className="h-full flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-white font-semibold mb-4">No venue linked to your account</p>
          <Button onClick={() => router.push('/venue-dashboard')}>
            Go to dashboard
          </Button>
        </div>
      </div>
    )
  }

  const remaining        = ticket ? ticket.quantity - (ticket.checkedInCount ?? 0) : 0
  const isFullyCheckedIn = ticket ? (ticket.checkedInCount ?? 0) >= ticket.quantity : false

  return (
    // ── Safe area padding for iOS notch + home indicator ──
    <div
      className="h-full flex flex-col bg-gray-900"
      style={{
        paddingTop:    'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
        <button
          onClick={() => router.push('/venue-dashboard')}
          className="flex items-center gap-1.5 text-sm font-semibold text-white/70 hover:text-white transition-colors"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          Dashboard
        </button>
        <div className="flex items-center gap-2">
          <div className={clsx(
            'w-2 h-2 rounded-full',
            scanState === 'scanning' ? 'bg-green-400 animate-pulse' : 'bg-gray-500'
          )} />
          <p className="text-sm font-bold text-white">
            {scanState === 'scanning' ? 'Scanner ready' : 'Scanner paused'}
          </p>
        </div>
      </div>

      {/* ── Scanner view ── */}
      {scanState === 'scanning' && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-6">
          <div className="w-full max-w-sm">
            <div className="text-center mb-6">
              <p className="text-white font-bold text-lg mb-1">Scan ticket QR code</p>
              <p className="text-white/50 text-sm">Point camera at the fan's QR code</p>
            </div>

            {cameraError ? (
              <div className="bg-gray-800 rounded-3xl p-8 text-center">
                <CameraIcon className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-white font-semibold mb-2">Camera unavailable</p>
                <p className="text-gray-400 text-sm mb-5">
                  Allow camera access in your browser settings to scan tickets.
                </p>
                <Button
                  fullWidth
                  onClick={() => {
                    setCameraError(false)
                    setScanState('scanning')
                  }}
                >
                  Try again
                </Button>
              </div>
            ) : (
              <div className="relative">
                <div
                  id="qr-reader"
                  className="w-full rounded-3xl overflow-hidden bg-gray-800"
                  style={{ height: '320px', maxHeight: '320px' }}
                />
                {/* Corner frame overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="relative w-56 h-56">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-brand-red rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-brand-red rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-brand-red rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-brand-red rounded-br-lg" />
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-brand-red/60 animate-scan-line" />
                  </div>
                </div>
              </div>
            )}

            <p className="text-center text-white/30 text-xs mt-4">
              Make sure the QR code is well lit and fully visible
            </p>
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {scanState === 'loading' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-white font-semibold">Looking up ticket...</p>
        </div>
      )}

      {/* ── Ticket found ── */}
      {scanState === 'found' && ticket && (
        // ── Scrollable so content never gets clipped ──────
        <div className="flex-1 overflow-y-auto px-4 pt-2 pb-6">
          <div className="bg-white rounded-3xl overflow-hidden shadow-2xl">

            {/* Status banner */}
            {isFullyCheckedIn ? (
              <div className="bg-amber-500 px-5 py-3 flex items-center gap-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-white flex-shrink-0" />
                <p className="text-white font-bold text-sm">
                  All {ticket.quantity} people already entered
                </p>
              </div>
            ) : ticket.checkedIn ? (
              <div className="bg-blue-500 px-5 py-3 flex items-center gap-2">
                <UserGroupIcon className="w-5 h-5 text-white flex-shrink-0" />
                <p className="text-white font-bold text-sm">
                  {ticket.checkedInCount} of {ticket.quantity} entered — {remaining} remaining
                </p>
              </div>
            ) : (
              <div className="bg-green-500 px-5 py-3 flex items-center gap-2">
                <TicketIcon className="w-5 h-5 text-white flex-shrink-0" />
                <p className="text-white font-bold text-sm">
                  Valid ticket
                  {ticket.quantity > 1 ? ` — ${ticket.quantity} person entry` : ''}
                </p>
              </div>
            )}

            <div className="p-5">

              {/* Fan details */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-brand-red-light rounded-full flex items-center justify-center text-lg font-bold text-brand-red flex-shrink-0">
                  {ticket.userName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-brand-charcoal text-base">
                    {ticket.userName}
                  </p>
                  <p className="text-xs text-gray-400">{ticket.userEmail}</p>
                </div>
              </div>

              {/* Event details */}
              <div className="bg-gray-50 rounded-2xl p-3 mb-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDaysIcon className="w-4 h-4 text-brand-red flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-brand-charcoal truncate">
                      {ticket.eventTitle}
                    </p>
                    <p className="text-xs text-gray-400">{ticket.eventDate}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm pt-1 border-t border-gray-200">
                  <span className="text-gray-400">Ticket ID</span>
                  <span className="font-mono text-xs text-gray-500">
                    {ticket.ticketId.slice(0, 12).toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Quantity selector */}
              {!isFullyCheckedIn && (
                <div className="mb-5">
                  <p className="text-sm font-bold text-brand-charcoal mb-3">
                    How many people entering now?
                  </p>

                  {ticket.quantity > 1 && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                        <span>
                          {ticket.checkedInCount > 0
                            ? `${ticket.checkedInCount} already entered`
                            : 'No one entered yet'
                          }
                        </span>
                        <span>{remaining} remaining</span>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {Array.from({ length: ticket.quantity }, (_, i) => (
                          <div
                            key={i}
                            className={clsx(
                              'w-3 h-3 rounded-full transition-colors',
                              i < (ticket.checkedInCount ?? 0)
                                ? 'bg-green-400'
                                : i < (ticket.checkedInCount ?? 0) + enteringNow
                                  ? 'bg-brand-red'
                                  : 'bg-gray-200'
                            )}
                          />
                        ))}
                      </div>
                      <div className="flex gap-3 mt-1.5 text-xs">
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" />
                          Entered
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-brand-red inline-block" />
                          Entering now
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-gray-200 inline-block" />
                          Remaining
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Stepper */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <button
                      onClick={() => setEnteringNow(n => Math.max(1, n - 1))}
                      disabled={enteringNow <= 1}
                      className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-xl font-bold text-brand-charcoal hover:border-brand-red hover:text-brand-red transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      −
                    </button>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-brand-charcoal">{enteringNow}</p>
                      <p className="text-xs text-gray-400">
                        {enteringNow === 1 ? 'person' : 'people'} entering
                      </p>
                    </div>
                    <button
                      onClick={() => setEnteringNow(n => Math.min(remaining, n + 1))}
                      disabled={enteringNow >= remaining}
                      className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-xl font-bold text-brand-charcoal hover:border-brand-red hover:text-brand-red transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="space-y-2">
                {isFullyCheckedIn ? (
                  <>
                    <div className="w-full py-3 px-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                      <p className="text-sm font-bold text-amber-700">
                        All {ticket.quantity} people have already entered
                      </p>
                      <p className="text-xs text-amber-600 mt-0.5">
                        This ticket has been fully used
                      </p>
                    </div>
                    <button
                      onClick={handleScanAnother}
                      className="w-full flex items-center justify-center gap-2 py-4 bg-brand-red text-white font-bold text-base rounded-2xl hover:bg-brand-red-dark active:scale-[0.98] transition-all"
                    >
                      <ArrowPathIcon className="w-5 h-5" />
                      Scan another ticket
                    </button>
                  </>
                ) : (
                  <>
                    <Button
                      fullWidth
                      size="lg"
                      loading={checkingIn}
                      onClick={handleCheckIn}
                    >
                      <CheckCircleIcon className="w-5 h-5 mr-2" />
                      Check in {enteringNow === 1 ? '1 person' : `${enteringNow} people`}
                    </Button>
                    <button
                      onClick={handleScanAnother}
                      className="w-full py-3 text-sm font-semibold text-gray-400 hover:text-brand-charcoal transition-colors"
                    >
                      Cancel — scan different ticket
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Extra space at bottom so content clears the safe area */}
          <div className="h-4" />
        </div>
      )}

      {/* ── Loading ── */}
      {scanState === 'loading' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-white font-semibold">Looking up ticket...</p>
        </div>
      )}

      {/* ── Success ── */}
      {scanState === 'success' && ticket && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-6">
          <div className="w-full max-w-sm text-center">
            <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
              <CheckCircleIcon className="w-14 h-14 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Checked in!</h2>
            <p className="text-white/60 text-sm mb-1">{ticket.userName}</p>
            <p className="text-white/40 text-xs mb-6">{ticket.eventTitle}</p>

            <div className="bg-white/10 rounded-2xl p-4 mb-6 text-left">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-white/60">Entered now</span>
                <span className="font-bold text-white">
                  {enteringNow} person{enteringNow !== 1 ? 's' : ''}
                </span>
              </div>
              {ticket.quantity > 1 && (
                <>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-white/60">Total entered</span>
                    <span className="font-bold text-white">
                      {ticket.checkedInCount + enteringNow} of {ticket.quantity}
                    </span>
                  </div>
                  {ticket.checkedInCount + enteringNow < ticket.quantity && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">Still to enter</span>
                      <span className="font-bold text-amber-400">
                        {ticket.quantity - (ticket.checkedInCount + enteringNow)} remaining
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            <button
              onClick={handleScanAnother}
              className="w-full flex items-center justify-center gap-2 py-4 bg-white text-brand-charcoal font-bold text-base rounded-2xl hover:bg-gray-100 active:scale-[0.98] transition-all"
            >
              <ArrowPathIcon className="w-5 h-5" />
              Scan next ticket
            </button>
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {scanState === 'error' && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-6">
          <div className="w-full max-w-sm text-center">
            <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/30">
              <XCircleIcon className="w-14 h-14 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Invalid ticket</h2>
            <p className="text-white/60 text-sm mb-8 leading-relaxed">{errorMsg}</p>
            <button
              onClick={handleScanAnother}
              className="w-full flex items-center justify-center gap-2 py-4 bg-white text-brand-charcoal font-bold text-base rounded-2xl hover:bg-gray-100 active:scale-[0.98] transition-all"
            >
              <ArrowPathIcon className="w-5 h-5" />
              Try again
            </button>
          </div>
        </div>
      )}

    </div>
  )
}