import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ticketsAPI } from '../api'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { QRCodeSVG } from 'qrcode.react'
import { MapPin, ChevronRight, Calendar, Clock, Bus, User, Download, ArrowLeft } from 'lucide-react'

export default function Ticket() {
  const { reservationId } = useParams()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ticketsAPI.getByReservation(reservationId)
      .then(r => setTicket(r.data.ticket))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [reservationId])

  if (loading) return <LoadingSpinner fullPage />
  if (!ticket) return <div className="container-page py-16 text-center text-gray-500">Ticket not found</div>

  // ANO-18 : l'API renvoie reservation_id et passenger.name (et non id / user_name)
  const ticketNumber = ticket.reservation_id
  const passengerName = ticket.passenger?.name

  const qrData = JSON.stringify({
    id: ticketNumber,
    route: `${ticket.departure} → ${ticket.destination}`,
    date: ticket.date,
    seats: ticket.seats,
    passenger: passengerName,
  })

  return (
    <div className="container-page py-10 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-gray-500 hover:text-burgundy-800 transition-colors">
          <ArrowLeft size={16} /> My Bookings
        </button>
        <button
          onClick={() => window.print()}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <Download size={15} /> Print Ticket
        </button>
      </div>

      {/* Ticket */}
      <div className="max-w-xl mx-auto" id="print-ticket">
        {/* Main card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-hero px-8 py-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-white/60 text-xs uppercase tracking-widest mb-1">BusInTunisia</p>
                <p className="text-white/80 text-sm">E-Ticket</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/60">Ticket #</p>
                <p className="font-mono font-bold">{String(ticketNumber).padStart(6, '0')}</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-extrabold">{ticket.departure}</p>
                <p className="text-white/60 text-sm mt-1">{ticket.departure_time?.slice(0,5)}</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2 text-white/40">
                  <div className="w-16 h-px bg-white/30" />
                  <Bus size={18} />
                  <div className="w-16 h-px bg-white/30" />
                </div>
                <p className="text-xs text-white/50 mt-1">{ticket.bus_type || 'Standard'}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-extrabold">{ticket.destination}</p>
                <p className="text-white/60 text-sm mt-1">{ticket.arrival_time?.slice(0,5)}</p>
              </div>
            </div>
          </div>

          {/* Dashed separator */}
          <div className="relative">
            <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-gray-50 dark:bg-gray-950 rounded-full" />
            <div className="border-t-2 border-dashed border-gray-200 dark:border-gray-700 mx-8" />
            <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-gray-50 dark:bg-gray-950 rounded-full" />
          </div>

          {/* Details grid */}
          <div className="px-8 py-6">
            <div className="grid grid-cols-2 gap-5 mb-6">
              {[
                { icon: User, label: 'Passenger', value: passengerName },
                { icon: Calendar, label: 'Date', value: new Date(ticket.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) },
                { icon: Clock, label: 'Departure', value: ticket.departure_time?.slice(0,5) },
                { icon: MapPin, label: 'Seats', value: Array.isArray(ticket.seats) ? ticket.seats.join(', ') : ticket.seats },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label}>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mb-1">
                    <Icon size={11} /> {label}
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">{value}</p>
                </div>
              ))}
            </div>

            {/* Status */}
            <div className="flex items-center justify-between mb-6 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <span className="text-green-700 dark:text-green-400 font-semibold text-sm">✓ Booking Confirmed</span>
              <span className="badge badge-success">{ticket.status || 'confirmed'}</span>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl">
              <QRCodeSVG
                value={qrData}
                size={140}
                bgColor="transparent"
                fgColor="#800020"
                level="M"
              />
              <p className="text-xs text-gray-400 mt-3 text-center">
                Show this QR code to the driver when boarding
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
