import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { tripsAPI, bookingsAPI } from '../api'
import SeatMap from '../components/booking/SeatMap'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { MapPin, Clock, Calendar, Bus, Users, ChevronRight, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Booking() {
  const { tripId } = useParams()
  const [sp] = useSearchParams()
  const passengers = Number(sp.get('passengers') || 1)
  const navigate = useNavigate()

  const [trip, setTrip] = useState(null)
  const [reservedSeats, setReservedSeats] = useState([])
  const [selectedSeats, setSelectedSeats] = useState([])
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)

  useEffect(() => {
    tripsAPI.getById(tripId)
      .then(r => {
        setTrip(r.data.trip)
        setReservedSeats(r.data.reservedSeats || [])
      })
      .catch(() => toast.error('Failed to load trip'))
      .finally(() => setLoading(false))
  }, [tripId])

  const toggleSeat = (num) => {
    setSelectedSeats(prev => {
      if (prev.includes(num)) return prev.filter(s => s !== num)
      if (prev.length >= passengers) {
        toast.error(`You can only select ${passengers} seat(s)`)
        return prev
      }
      return [...prev, num]
    })
  }

  const handleBook = async () => {
    if (selectedSeats.length !== passengers) {
      toast.error(`Please select exactly ${passengers} seat(s)`)
      return
    }
    setBooking(true)
    try {
      const res = await bookingsAPI.create({ trip_id: tripId, seats: selectedSeats })
      toast.success('Booking confirmed! 🎉')
      navigate(`/ticket/${res.data.reservation_id}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed')
    } finally {
      setBooking(false)
    }
  }

  if (loading) return <LoadingSpinner fullPage />
  if (!trip) return <div className="container-page py-16 text-center text-gray-500">Trip not found</div>

  return (
    <div className="container-page py-8 animate-fade-in">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-burgundy-800 mb-6 transition-colors">
        <ArrowLeft size={16} /> Back to results
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Seat map */}
        <div className="lg:col-span-2">
          <div className="card mb-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Select Your Seats</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-burgundy-600" />
                <span className="font-semibold">{trip.departure}</span>
                <ChevronRight size={12} />
                <span className="font-semibold">{trip.destination}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar size={13} />
                {new Date(trip.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <div className="flex items-center gap-1">
                <Clock size={13} />
                {trip.departure_time?.slice(0,5)} → {trip.arrival_time?.slice(0,5)}
              </div>
              <div className="flex items-center gap-1">
                <Bus size={13} />
                {trip.bus_type || 'Standard'}
              </div>
              <div className="flex items-center gap-1">
                <Users size={13} />
                Select {passengers} seat(s)
              </div>
            </div>

            <SeatMap
              totalSeats={trip.bus_capacity || 40}
              reserved={reservedSeats}
              selected={selectedSeats}
              onToggle={toggleSeat}
            />
          </div>
        </div>

        {/* Booking summary */}
        <div className="lg:col-span-1">
          <div className="card sticky top-20">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Booking Summary</h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Route</span>
                <span className="font-medium">{trip.departure} → {trip.destination}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Date</span>
                <span className="font-medium">{new Date(trip.date).toLocaleDateString('en-GB')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Departure</span>
                <span className="font-medium">{trip.departure_time?.slice(0,5)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Bus type</span>
                <span className="font-medium">{trip.bus_type || 'Standard'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Seats selected</span>
                <span className="font-medium text-burgundy-800 dark:text-burgundy-400">
                  {selectedSeats.length > 0 ? selectedSeats.join(', ') : '—'}
                </span>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Price/seat</span>
                  <span>{trip.price} TND</span>
                </div>
                <div className="flex justify-between text-lg font-bold mt-2">
                  <span>Total</span>
                  <span className="text-burgundy-800 dark:text-burgundy-400">
                    {(trip.price * passengers).toFixed(2)} TND
                  </span>
                </div>
              </div>
            </div>

            <div className={`text-center text-sm mb-4 py-2 rounded-lg ${selectedSeats.length === passengers ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' : 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400'}`}>
              {selectedSeats.length === passengers
                ? '✓ Ready to book!'
                : `Select ${passengers - selectedSeats.length} more seat(s)`}
            </div>

            <button
              id="confirm-booking"
              className="btn-primary w-full flex items-center justify-center gap-2"
              onClick={handleBook}
              disabled={booking || selectedSeats.length !== passengers}
            >
              {booking ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Confirm Booking <ChevronRight size={16} /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
