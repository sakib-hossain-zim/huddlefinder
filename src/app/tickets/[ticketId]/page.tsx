'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { QRCodeSVG } from 'qrcode.react'
import {
  CalendarDaysIcon,
  BuildingStorefrontIcon,
  TicketIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'

interface Ticket {
  ticketId:    string
  eventId:     string
  venueId:     string
  userId:      string
  userEmail:   string
  userName:    string
  eventTitle:  string
  venueName:   string
  eventDate:   string
  ticketPrice: number
  quantity:    number
  totalPrice:  number
  qrData:      string
  checkedIn:   boolean
  checkedInAt: any
  purchasedAt: any
}

export default function TicketPage({
  params,
}: {
  params: Promise<{ ticketId: string }>
}) {
  const { ticketId } = use(params)
  const router       = useRouter()
  const { user }     = useAuth()

  const [ticket,  setTicket]  = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (user === undefined) return
    if (!user) {
      router.replace('/auth/login')
      return
    }
    fetchTicket()
  }, [user])

  async function fetchTicket() {
    try {
      const snap = await getDoc(doc(db, 'tickets', ticketId))
      if (!snap.exists()) {
        setError('Ticket not found.')
        setLoading(false)
        return
      }
      const data = snap.data() as Ticket

      // Security — only ticket owner can view
      if (data.userId !== user!.uid) {
        setError('You do not have permission to view this ticket.')
        setLoading(false)
        return
      }

      setTicket({ ...data, ticketId: snap.id })
    } catch (err) {
      console.error(err)
      setError('Failed to load ticket. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingSpinner fullPage />

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-sm border border-gray-100">
          <span className="text-4xl mb-4 block">⚠️</span>
          <h2 className="text-lg font-bold text-brand-charcoal mb-2">
            Ticket unavailable
          </h2>
          <p className="text-sm text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.replace('/')}
            className="w-full py-3 bg-brand-red text-white rounded-xl text-sm font-semibold hover:bg-brand-red-dark transition-colors"
          >
            Go home
          </button>
        </div>
      </div>
    )
  }

  if (!ticket) return null

  const isGroupTicket = (ticket.quantity ?? 1) > 1
  const pricePerTicket = ticket.ticketPrice / 100
  const totalPaid      = (ticket.totalPrice ?? ticket.ticketPrice) / 100

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="max-w-sm mx-auto px-4 py-6">

        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
            Your ticket
          </p>
          <h1 className="text-xl font-bold text-brand-charcoal">
            {ticket.eventTitle}
          </h1>
        </div>

        {/* Ticket card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-lg overflow-hidden mb-4">

          {/* Ticket header — red strip */}
          <div className="bg-brand-red p-5 text-white">
            <div className="flex items-center gap-2 mb-1">
              <TicketIcon className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Huddlefinder Ticket
              </span>
            </div>
            <p className="font-bold text-lg leading-tight">{ticket.eventTitle}</p>
            {isGroupTicket && (
              <div className="flex items-center gap-1.5 mt-2 bg-white/20 rounded-full px-3 py-1 w-fit">
                <UserGroupIcon className="w-3.5 h-3.5" />
                <span className="text-xs font-bold">
                  {ticket.quantity} person entry
                </span>
              </div>
            )}
          </div>

          {/* Ticket details */}
          <div className="p-5 space-y-3 border-b border-dashed border-gray-200">
            <div className="flex items-center gap-2.5 text-sm">
              <BuildingStorefrontIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Venue</p>
                <p className="font-semibold text-brand-charcoal">{ticket.venueName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              <CalendarDaysIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Date</p>
                <p className="font-semibold text-brand-charcoal">{ticket.eventDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              <TicketIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Ticket holder</p>
                <p className="font-semibold text-brand-charcoal">{ticket.userName}</p>
              </div>
            </div>
          </div>

          {/* QR Code section */}
          <div className="p-6 flex flex-col items-center">
            {ticket.checkedIn ? (
              // Already checked in
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center">
                  <CheckCircleIcon className="w-12 h-12 text-green-500" />
                </div>
                <p className="text-sm font-bold text-green-600">
                  Checked in ✓
                </p>
                <p className="text-xs text-gray-400 text-center">
                  This ticket has been used. Enjoy the event!
                </p>
              </div>
            ) : (
              // Valid QR code
              <>
                <div className="p-3 bg-white border-2 border-gray-100 rounded-2xl mb-4 shadow-sm">
                  <QRCodeSVG
                    value={ticket.qrData}
                    size={200}
                    level="H"
                    includeMargin={false}
                  />
                </div>

                {/* Group entry badge */}
                {isGroupTicket && (
                  <div className="flex items-center gap-2 bg-brand-red text-white px-4 py-2 rounded-full mb-3">
                    <UserGroupIcon className="w-4 h-4" />
                    <span className="text-sm font-bold">
                      Admits {ticket.quantity} people
                    </span>
                  </div>
                )}

                <p className="text-xs text-gray-400 text-center">
                  Show this QR code at the door
                  {isGroupTicket && (
                    <span className="block mt-0.5 font-semibold text-brand-charcoal">
                      All {ticket.quantity} people must enter together
                    </span>
                  )}
                </p>
              </>
            )}
          </div>

          {/* Ticket footer */}
          <div className="px-5 pb-5">
            <div className="flex items-center justify-between pt-4 border-t border-dashed border-gray-200">
              <div>
                <p className="text-xs text-gray-400">
                  {isGroupTicket
                    ? `${ticket.quantity} × $${pricePerTicket.toFixed(2)}`
                    : 'Amount paid'
                  }
                </p>
                <p className="font-bold text-brand-charcoal">
                  ${totalPaid.toFixed(2)} CAD
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Ticket ID</p>
                <p className="text-xs font-mono text-gray-500">
                  {ticket.ticketId.slice(0, 8).toUpperCase()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Save instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3 mb-4">
          <ArrowDownTrayIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-blue-800">Save your ticket</p>
            <p className="text-xs text-blue-600 mt-0.5">
              Take a screenshot of this page.
              {isGroupTicket
                ? ` One QR code admits all ${ticket.quantity} people.`
                : ' Show the QR code at the door.'
              }
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-300">
          Ticket #{ticket.ticketId.slice(0, 16).toUpperCase()}
        </p>

      </div>
    </div>
  )
}