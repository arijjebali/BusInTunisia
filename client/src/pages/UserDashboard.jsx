import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { bookingsAPI, groupsAPI, reviewsAPI } from '../api'
import ReviewStars from '../components/common/ReviewStars'
import LoadingSpinner from '../components/common/LoadingSpinner'
import toast from 'react-hot-toast'
import {
  Ticket, Users, Clock, Bell, X, Star,
  MapPin, ChevronRight, Calendar, Bus
} from 'lucide-react'

const TABS = [
  { id: 'bookings', label: 'My Bookings', icon: Ticket },
  { id: 'groups', label: 'Group Requests', icon: Users },
  { id: 'notifications', label: 'Notifications', icon: Bell },
]

const STATUS_BADGE = {
  confirmed: 'badge-success',
  pending: 'badge-warning',
  cancelled: 'badge-danger',
  accepted: 'badge-success',
  rejected: 'badge-danger',
}



export default function UserDashboard() {
  const { user } = useAuth()
  const [tab, setTab] = useState('bookings')
  const [bookings, setBookings] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [reviewModal, setReviewModal] = useState(null)
  const [review, setReview] = useState({ rating: 5, comment: '' })

  useEffect(() => {
    Promise.all([bookingsAPI.getMy(), groupsAPI.getMy()])
      .then(([b, g]) => { setBookings(b.data.bookings); setGroups(g.data.groups) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleCancel = async (id) => {
    if (!confirm('Cancel this booking?')) return
    try {
      await bookingsAPI.cancel(id)
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b))
      toast.success('Booking cancelled')
    } catch {
      toast.error('Failed to cancel booking')
    }
  }

  const handleReview = async () => {
    try {
      await reviewsAPI.submit({ trip_id: reviewModal.trip_id, ...review })
      toast.success('Review submitted!')
      setReviewModal(null)
    } catch {
      toast.error('Failed to submit review')
    }
  }

  if (loading) return <LoadingSpinner fullPage />

  return (
    <div className="container-page py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome back, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your bookings and travel history</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Trips', value: bookings.length, color: 'text-burgundy-800 dark:text-burgundy-400' },
          { label: 'Active', value: bookings.filter(b => b.status === 'confirmed').length, color: 'text-green-600' },
          { label: 'Cancelled', value: bookings.filter(b => b.status === 'cancelled').length, color: 'text-red-500' },
          { label: 'Group Requests', value: groups.length, color: 'text-blue-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card text-center">
            <p className={`text-3xl font-bold ${color} mb-1`}>{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
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

      {/* Bookings */}
      {tab === 'bookings' && (
        <div className="space-y-4">
          {bookings.length === 0 ? (
            <div className="card text-center py-16">
              <Ticket size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">No bookings yet</h3>
              <p className="text-gray-500 mb-4">Start your journey by searching for a trip</p>
              <Link to="/search" className="btn-primary inline-block">Find Trips</Link>
            </div>
          ) : (
            bookings.map(b => (
              <div key={b.id} className="card">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`badge ${STATUS_BADGE[b.status] || 'badge-neutral'}`}>{b.status}</span>
                      <span className="text-xs text-gray-400">#{String(b.id).padStart(6, '0')}</span>
                    </div>
                    <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white mb-1">
                      <MapPin size={14} className="text-burgundy-600" />
                      {b.departure} <ChevronRight size={12} /> {b.destination}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(b.date).toLocaleDateString('en-GB')}</span>
                      <span className="flex items-center gap-1"><Clock size={12} /> {b.departure_time?.slice(0,5)}</span>
                      <span className="flex items-center gap-1"><Bus size={12} /> {b.bus_type || 'Standard'}</span>
                      <span>Seats: {Array.isArray(b.seats) ? b.seats.join(', ') : b.seats}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {b.status === 'confirmed' && (
                      <>
                        <Link to={`/ticket/${b.id}`} className="btn-secondary text-sm py-2 px-3">View Ticket</Link>
                        <button onClick={() => setReviewModal(b)} className="btn-ghost text-sm flex items-center gap-1">
                          <Star size={14} /> Review
                        </button>
                        <button onClick={() => handleCancel(b.id)} className="btn-danger text-sm py-2 px-3 flex items-center gap-1">
                          <X size={14} /> Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Group requests */}
      {tab === 'groups' && (
        <div className="space-y-4">
          {groups.length === 0 ? (
            <div className="card text-center py-16">
              <Users size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">No group requests yet</h3>
              <Link to="/group-trip" className="btn-primary inline-block mt-2">Request Group Trip</Link>
            </div>
          ) : (
            groups.map(g => (
              <div key={g.id} className="card">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`badge ${STATUS_BADGE[g.status] || 'badge-neutral'}`}>{g.status}</span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{g.trip_type}</span>
                    </div>
                    <p className="font-semibold">{g.departure} → {g.destination}</p>
                    <p className="text-sm text-gray-500">{new Date(g.date).toLocaleDateString('en-GB')} · {g.people_count} people</p>
                  </div>
                  <div className="text-right">
                    {g.price ? (
                      <>
                        <p className="text-2xl font-bold text-burgundy-800 dark:text-burgundy-400">{g.price} TND</p>
                        <p className="text-xs text-gray-400">{(g.price / g.people_count).toFixed(1)} TND/person</p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Price pending...</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Notifications */}
      {tab === 'notifications' && (() => {
        const notifs = []
        bookings.forEach(b => {
          const tripDate = new Date(b.date)
          const today = new Date()
          today.setHours(0,0,0,0)
          const diffDays = Math.round((tripDate - today) / (1000 * 60 * 60 * 24))

          if (b.status === 'confirmed') {
            notifs.push({
              id: `confirmed-${b.id}`,
              msg: `Your booking to ${b.destination} is confirmed! Departure on ${tripDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} at ${b.departure_time?.slice(0,5)}.`,
              type: 'success',
              read: true
            })
          }
          if (b.status === 'confirmed' && diffDays === 1) {
            notifs.push({
              id: `reminder-${b.id}`,
              msg: `⏰ Trip reminder: ${b.departure} → ${b.destination} is tomorrow at ${b.departure_time?.slice(0,5)}!`,
              type: 'reminder',
              read: false
            })
          }
          if (b.status === 'confirmed' && diffDays === 0) {
            notifs.push({
              id: `today-${b.id}`,
              msg: `🚌 Your trip ${b.departure} → ${b.destination} is TODAY at ${b.departure_time?.slice(0,5)}! Have a great journey!`,
              type: 'reminder',
              read: false
            })
          }
          if (b.status === 'cancelled') {
            notifs.push({
              id: `cancelled-${b.id}`,
              msg: `Your booking to ${b.destination} has been cancelled.`,
              type: 'danger',
              read: true
            })
          }
        })

        groups.forEach(g => {
          if (g.status === 'accepted') {
            notifs.push({
              id: `group-${g.id}`,
              msg: `✅ Your group request for ${g.departure} → ${g.destination} has been accepted!`,
              type: 'success',
              read: false
            })
          }
          if (g.status === 'rejected') {
            notifs.push({
              id: `group-rej-${g.id}`,
              msg: `Your group request for ${g.departure} → ${g.destination} was not accepted.`,
              type: 'danger',
              read: true
            })
          }
        })

        if (notifs.length === 0) {
          return (
            <div className="card text-center py-16">
              <Bell size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">No notifications yet</h3>
              <p className="text-gray-500">You&apos;ll be notified about your bookings and trips here.</p>
            </div>
          )
        }

        return (
          <div className="space-y-3">
            {notifs.map(n => (
              <div key={n.id} className={`card flex items-start gap-4 ${!n.read ? 'border-l-4 border-burgundy-800' : ''}`}>
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                  !n.read ? 'bg-burgundy-800' :
                  n.type === 'danger' ? 'bg-red-400' : 'bg-gray-300'
                }`} />
                <div>
                  <p className={`text-sm ${!n.read ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-500'}`}>{n.msg}</p>
                </div>
              </div>
            ))}
          </div>
        )
      })()}

      {/* Review modal */}
      {reviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-slide-up">
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">Rate Your Trip</h3>
            <p className="text-sm text-gray-500 mb-4">{reviewModal.departure} → {reviewModal.destination}</p>
            <div className="flex justify-center mb-4">
              <ReviewStars rating={review.rating} onChange={r => setReview(p => ({ ...p, rating: r }))} size={32} />
            </div>
            <textarea
              className="input h-24 resize-none"
              placeholder="Share your experience..."
              value={review.comment}
              onChange={e => setReview(p => ({ ...p, comment: e.target.value }))}
            />
            <div className="flex gap-3 mt-4">
              <button className="btn-outline flex-1" onClick={() => setReviewModal(null)}>Cancel</button>
              <button className="btn-primary flex-1" onClick={handleReview}>Submit Review</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
