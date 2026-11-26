import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { operatorAPI } from '../api'
import LoadingSpinner from '../components/common/LoadingSpinner'
import toast from 'react-hot-toast'
import {
  Calendar, Clock, Bus, MapPin, ChevronRight, Users, Compass, ShieldAlert
} from 'lucide-react'

const TABS = [
  { id: 'schedule', label: 'My Schedule', icon: Calendar },
  { id: 'buses', label: 'My Buses', icon: Bus },
]

export default function OperatorDashboard() {
  const { user } = useAuth()
  const [tab, setTab] = useState('schedule')
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    operatorAPI.getTrips()
      .then(res => {
        setTrips(res.data.trips)
      })
      .catch(() => {
        toast.error('Failed to load operator schedule')
      })
      .finally(() => setLoading(false))
  }, [])

  // Derive unique buses assigned to this operator
  const busesMap = new Map()
  trips.forEach(t => {
    if (t.bus_reg) {
      busesMap.set(t.bus_reg, {
        registration_number: t.bus_reg,
        capacity: t.capacity,
        type: t.bus_type || 'Standard'
      })
    }
  })
  const myBuses = Array.from(busesMap.values())

  const totalBookedSeats = trips.reduce((acc, curr) => acc + (curr.booked_seats || 0), 0)

  if (loading) return <LoadingSpinner fullPage />

  return (
    <div className="container-page py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome back, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Operator Portal · Manage your assigned routes and buses</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Assigned Trips', value: trips.length, color: 'text-burgundy-800 dark:text-burgundy-400' },
          { label: 'Total Passengers booked', value: totalBookedSeats, color: 'text-green-600 dark:text-green-400' },
          { label: 'Assigned Buses', value: myBuses.length, color: 'text-blue-600 dark:text-blue-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card text-center p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <p className={`text-3xl font-bold ${color} mb-1`}>{value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto scrollbar-hide">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              tab === id
                ? 'border-burgundy-800 text-burgundy-800 dark:text-burgundy-400 dark:border-burgundy-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* My Schedule Tab */}
      {tab === 'schedule' && (
        <div className="space-y-4">
          {trips.length === 0 ? (
            <div className="card text-center py-16">
              <Compass size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">No assigned trips yet</h3>
              <p className="text-gray-500 dark:text-gray-400">You are currently not scheduled for any upcoming trips.</p>
            </div>
          ) : (
            trips.map(t => {
              const occupancyRate = t.capacity ? Math.round((t.booked_seats / t.capacity) * 100) : 0
              return (
                <div key={t.id} className="card hover:shadow-md transition-shadow">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex-1 space-y-3">
                      {/* Route Path */}
                      <div className="flex items-center gap-2 font-semibold text-lg text-gray-900 dark:text-white">
                        <MapPin size={16} className="text-burgundy-800 dark:text-burgundy-400" />
                        {t.departure} <ChevronRight size={14} className="text-gray-400" /> {t.arrival}
                      </div>

                      {/* Details row */}
                      <div className="flex flex-wrap gap-y-2 gap-x-6 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-gray-400" />
                          {new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock size={14} className="text-gray-400" />
                          {t.departure_time} - {t.arrival_time}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Bus size={14} className="text-gray-400" />
                          Bus: <span className="font-semibold text-gray-700 dark:text-gray-300">{t.bus_reg}</span>
                        </span>
                      </div>

                      {/* Occupancy progress bar */}
                      <div className="w-full max-w-md pt-2">
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-gray-600 dark:text-gray-400">Passenger Load</span>
                          <span className="text-gray-900 dark:text-white">{t.booked_seats} / {t.capacity} seats ({occupancyRate}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              occupancyRate > 85 ? 'bg-red-500' : occupancyRate > 50 ? 'bg-amber-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(occupancyRate, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Quick overview widget / Actions */}
                    <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-2 border-t lg:border-t-0 border-gray-100 dark:border-gray-800 pt-4 lg:pt-0">
                      <div className="text-left lg:text-right">
                        <span className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Ticket Price</span>
                        <span className="text-2xl font-bold text-burgundy-800 dark:text-burgundy-400">{t.price} TND</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* My Buses Tab */}
      {tab === 'buses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myBuses.length === 0 ? (
            <div className="col-span-full card text-center py-16">
              <ShieldAlert size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">No buses assigned</h3>
              <p className="text-gray-500 dark:text-gray-400">Ask the administrator to assign a bus to you in the admin panel.</p>
            </div>
          ) : (
            myBuses.map(b => (
              <div key={b.registration_number} className="card flex flex-col justify-between border border-gray-100 dark:border-gray-800 p-6 hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 bg-burgundy-50 dark:bg-burgundy-950/30 text-burgundy-800 dark:text-burgundy-400 rounded-full text-xs font-semibold uppercase tracking-wider">
                      Active Vehicle
                    </span>
                    <Bus size={24} className="text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    {b.registration_number}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Registration Matricule</p>
                  
                  <div className="space-y-2 border-t border-gray-100 dark:border-gray-800 pt-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Capacity</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{b.capacity} Seats</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Comfort Type</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{b.type}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
