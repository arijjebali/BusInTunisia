import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { tripsAPI } from '../api'
import TripCard from '../components/booking/TripCard'
import SkeletonCard from '../components/common/SkeletonCard'
import { SlidersHorizontal, MapPin, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react'

export default function SearchResults() {
  const [params] = useSearchParams()
  const departure = params.get('departure') || ''
  const destination = params.get('destination') || ''
  const date = params.get('date') || ''
  const passengers = Number(params.get('passengers') || 1)

  const [trips, setTrips] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({ maxPrice: 200, timeFrom: '00:00', timeTo: '23:59', type: '' })
  const [sortBy, setSortBy] = useState('price')

  useEffect(() => {
    setLoading(true)
    tripsAPI.search({ departure, destination, date, passengers })
      .then(r => { setTrips(r.data.trips); setFiltered(r.data.trips) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [departure, destination, date, passengers])

  useEffect(() => {
    let res = trips.filter(t => {
      const price = Number(t.price)
      const time = t.departure_time?.slice(0, 5) || '00:00'
      const typeOk = !filters.type || t.bus_type === filters.type
      return price <= filters.maxPrice && time >= filters.timeFrom && time <= filters.timeTo && typeOk
    })
    res = [...res].sort((a, b) => {
      if (sortBy === 'price') return a.price - b.price
      if (sortBy === 'time') return a.departure_time?.localeCompare(b.departure_time)
      return 0
    })
    setFiltered(res)
  }, [trips, filters, sortBy])

  return (
    <div className="container-page py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <MapPin size={14} className="text-burgundy-600" />
          <span className="font-medium text-gray-900 dark:text-white">{departure}</span>
          <ArrowRight size={12} />
          <span className="font-medium text-gray-900 dark:text-white">{destination}</span>
          {date && <span className="ml-2">· {new Date(date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span>}
          {passengers > 1 && <span>· {passengers} passengers</span>}
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {loading ? 'Searching...' : `${filtered.length} trip${filtered.length !== 1 ? 's' : ''} found`}
          </h1>
          <div className="flex items-center gap-3">
            <select
              className="input py-2 text-sm w-auto"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="price">Sort: Price</option>
              <option value="time">Sort: Departure</option>
            </select>
            <button
              className="btn-secondary py-2 px-3 text-sm flex items-center gap-2"
              onClick={() => setShowFilters(f => !f)}
            >
              <SlidersHorizontal size={15} />
              Filters
              {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filters sidebar */}
        <aside className={`lg:w-64 flex-shrink-0 ${showFilters ? 'block' : 'hidden lg:block'}`}>
          <div className="card sticky top-20 space-y-6">
            <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <SlidersHorizontal size={16} className="text-burgundy-800" />
              Filters
            </h2>

            <div>
              <label className="label">Max Price: <span className="text-burgundy-800 font-bold">{filters.maxPrice} TND</span></label>
              <input
                type="range" min={5} max={200} step={5}
                value={filters.maxPrice}
                onChange={e => setFilters(p => ({ ...p, maxPrice: Number(e.target.value) }))}
                className="w-full accent-burgundy-800"
              />
            </div>

            <div>
              <label className="label">Departure from</label>
              <input
                type="time" className="input" value={filters.timeFrom}
                onChange={e => setFilters(p => ({ ...p, timeFrom: e.target.value }))}
              />
            </div>

            <div>
              <label className="label">Departure until</label>
              <input
                type="time" className="input" value={filters.timeTo}
                onChange={e => setFilters(p => ({ ...p, timeTo: e.target.value }))}
              />
            </div>

            <div>
              <label className="label">Bus Type</label>
              <select
                className="input"
                value={filters.type}
                onChange={e => setFilters(p => ({ ...p, type: e.target.value }))}
              >
                <option value="">All Types</option>
                <option>Standard</option>
                <option>Comfort</option>
                <option>VIP</option>
              </select>
            </div>

            <button
              className="btn-outline w-full text-sm"
              onClick={() => setFilters({ maxPrice: 200, timeFrom: '00:00', timeTo: '23:59', type: '' })}
            >
              Reset Filters
            </button>
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1 space-y-4">
          {loading ? (
            Array(3).fill(0).map((_, i) => <SkeletonCard key={i} />)
          ) : filtered.length === 0 ? (
            <div className="card text-center py-16">
              <div className="text-6xl mb-4">🚌</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No trips found</h3>
              <p className="text-gray-500 dark:text-gray-400">
                {!departure || !destination
                  ? 'Please select departure and destination from the home page.'
                  : 'Try adjusting your filters or search for a different date.'}
              </p>
            </div>
          ) : (
            filtered.map(trip => <TripCard key={trip.id} trip={trip} passengers={passengers} />)
          )}
        </div>
      </div>
    </div>
  )
}
