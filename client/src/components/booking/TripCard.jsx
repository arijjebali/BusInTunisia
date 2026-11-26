import { Link } from 'react-router-dom'
import { Clock, Bus, ChevronRight, Star, ArrowRight } from 'lucide-react'

const BUS_TYPE_COLORS = {
  Standard: 'badge-neutral',
  Comfort: 'badge-info',
  VIP: 'badge-warning',
}

export default function TripCard({ trip, passengers = 1 }) {
  const duration = calcDuration(trip.departure_time, trip.arrival_time)

  return (
    <div className="card hover:border hover:border-burgundy-200 dark:hover:border-burgundy-800 transition-all duration-300 animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Time section */}
        <div className="flex items-center gap-4 sm:gap-8 flex-1">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{trip.departure_time?.slice(0,5)}</p>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">{trip.departure}</p>
          </div>

          <div className="flex-1 flex flex-col items-center">
            <p className="text-xs text-gray-400 mb-1.5">{duration}</p>
            <div className="relative w-full flex items-center">
              <div className="h-px flex-1 bg-gradient-to-r from-gray-200 via-burgundy-400 to-gray-200 dark:from-gray-700 dark:via-burgundy-600 dark:to-gray-700" />
              <ArrowRight size={14} className="absolute right-0 text-burgundy-600" />
            </div>
            <div className="flex items-center gap-1 mt-1.5">
              <Bus size={11} className="text-gray-400" />
              <span className="text-xs text-gray-400">{trip.bus_type || 'Standard'}</span>
            </div>
          </div>

          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{trip.arrival_time?.slice(0,5)}</p>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">{trip.destination}</p>
          </div>
        </div>

        {/* Info & CTA */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-4 sm:gap-2 sm:min-w-[140px]">
          <div className="text-right">
            <p className="text-2xl font-bold text-burgundy-800 dark:text-burgundy-400">
              {trip.price} <span className="text-sm font-medium">TND</span>
            </p>
            {passengers > 1 && (
              <p className="text-xs text-gray-400">{(trip.price * passengers).toFixed(0)} TND total</p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <span className={`badge ${BUS_TYPE_COLORS[trip.bus_type] || 'badge-neutral'}`}>
                {trip.bus_type || 'Standard'}
              </span>
              <div className="flex items-center gap-0.5">
                <Star size={12} className="text-yellow-400 fill-yellow-400" />
                <span className="text-xs text-gray-500">{trip.avg_rating ? Number(trip.avg_rating).toFixed(1) : '—'}</span>
              </div>
            </div>
            <Link
              to={`/booking/${trip.id}?passengers=${passengers}`}
              className="btn-primary py-2 px-4 text-sm flex items-center gap-1"
              id={`book-trip-${trip.id}`}
            >
              Book Now <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Available seats */}
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={13} className="text-gray-400" />
          <span className="text-xs text-gray-400">
            {trip.date ? new Date(trip.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : ''}
          </span>
        </div>
        <span className={`text-xs font-medium ${(trip.available_seats || 0) < 10 ? 'text-orange-500' : 'text-green-600'}`}>
          {trip.available_seats ?? '?'} seats left
        </span>
      </div>
    </div>
  )
}

function calcDuration(dep, arr) {
  if (!dep || !arr) return '—'
  const [dh, dm] = dep.split(':').map(Number)
  const [ah, am] = arr.split(':').map(Number)
  let mins = (ah * 60 + am) - (dh * 60 + dm)
  if (mins < 0) mins += 1440
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}
