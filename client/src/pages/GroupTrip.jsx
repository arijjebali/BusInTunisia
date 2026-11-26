import { useState } from 'react'
import { groupsAPI } from '../api'
import toast from 'react-hot-toast'
import { MapPin, Calendar, Users, Clock, Send, CheckCircle, ChevronDown } from 'lucide-react'

const CITIES = [
  'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Djerba', 'Douz', 'Gabès', 'Gafsa',
  'Hammamet', 'Jendouba', 'Kairouan', 'Kasserine', 'Kebili', 'Le Kef', 'Mahdia',
  'Manouba', 'Medenine', 'Monastir', 'Nabeul', 'Sfax', 'Sidi Bouzid', 'Siliana',
  'Sousse', 'Tabarka', 'Tataouine', 'Tozeur', 'Tunis', 'Zaghouan', 'Zarzis'
]
const TRIP_TYPES = [
  { value: 'friends', label: '👫 Friends', desc: 'Outing with friends' },
  { value: 'family', label: '👨‍👩‍👧 Family', desc: 'Family vacation' },
  { value: 'school', label: '🎓 School', desc: 'Educational trip' },
  { value: 'corporate', label: '💼 Corporate', desc: 'Business travel' },
]

const BASE_PRICES = { Standard: 8, Comfort: 12, VIP: 18 }

export default function GroupTrip() {
  const [form, setForm] = useState({
    departure: '', destination: '', date: '', people_count: 10,
    preferred_time: '08:00', trip_type: 'friends', bus_pref: 'Standard', notes: ''
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const estimatedTotal = Math.round(BASE_PRICES[form.bus_pref] * form.people_count * 1.2)
  const perPerson = form.people_count > 0 ? (estimatedTotal / form.people_count).toFixed(1) : 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.departure || !form.destination || !form.date) {
      toast.error('Please fill all required fields')
      return
    }
    if (form.departure === form.destination) {
      toast.error('Departure and destination must be different')
      return
    }
    setLoading(true)
    try {
      await groupsAPI.submit({ ...form, estimated_price: estimatedTotal })
      setSubmitted(true)
      toast.success('Group request submitted! We\'ll contact you soon.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="container-page py-16 animate-fade-in">
        <div className="max-w-lg mx-auto card text-center py-12">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Request Submitted!</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Our team will review your group trip request and get back to you within 24 hours with pricing and availability.
          </p>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 text-sm text-left mb-6 space-y-2">
            <p><span className="font-medium">Route:</span> {form.departure} → {form.destination}</p>
            <p><span className="font-medium">Date:</span> {new Date(form.date).toLocaleDateString('en-GB')}</p>
            <p><span className="font-medium">Passengers:</span> {form.people_count}</p>
            <p><span className="font-medium">Estimated price:</span> {estimatedTotal} TND total ({perPerson} TND/person)</p>
          </div>
          <button onClick={() => setSubmitted(false)} className="btn-outline">Submit Another Request</button>
        </div>
      </div>
    )
  }

  return (
    <div className="container-page py-8 animate-fade-in">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 bg-burgundy-100 dark:bg-burgundy-900/30 text-burgundy-800 dark:text-burgundy-400 text-sm px-4 py-2 rounded-full mb-4">
          <Users size={14} />
          Group Travel Request
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">Travel Together</h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
          Planning a group trip? Fill in the details and we&apos;ll arrange a dedicated bus with exclusive pricing.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="card space-y-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Trip Details</h2>

            {/* Route */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Departure City *</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select id="group-departure" className="input pl-9" value={form.departure} onChange={e => update('departure', e.target.value)} required>
                    <option value="">Select city</option>
                    {CITIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Destination *</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-burgundy-600" />
                  <select id="group-destination" className="input pl-9" value={form.destination} onChange={e => update('destination', e.target.value)} required>
                    <option value="">Select city</option>
                    {CITIES.filter(c => c !== form.departure).map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Travel Date *</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="group-date"
                    type="date"
                    className="input pl-9"
                    value={form.date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => update('date', e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label">Preferred Time</label>
                <div className="relative">
                  <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="time" className="input pl-9" value={form.preferred_time} onChange={e => update('preferred_time', e.target.value)} />
                </div>
              </div>
            </div>

            {/* People count */}
            <div>
              <label className="label">Number of Passengers: <span className="text-burgundy-800 font-bold">{form.people_count}</span></label>
              <div className="flex items-center gap-4">
                <input
                  type="range" min={5} max={60} step={1}
                  value={form.people_count}
                  onChange={e => update('people_count', Number(e.target.value))}
                  className="flex-1 accent-burgundy-800"
                />
                <div className="relative w-20">
                  <Users size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number" min={5} max={60}
                    className="input pl-8 text-center"
                    value={form.people_count}
                    onChange={e => update('people_count', Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            {/* Trip type */}
            <div>
              <label className="label">Trip Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {TRIP_TYPES.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => update('trip_type', t.value)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      form.trip_type === t.value
                        ? 'border-burgundy-800 bg-burgundy-50 dark:bg-burgundy-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-burgundy-300'
                    }`}
                  >
                    <p className="text-lg mb-1">{t.label.split(' ')[0]}</p>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{t.label.split(' ').slice(1).join(' ')}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Bus preference */}
            <div>
              <label className="label">Bus Preference</label>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(BASE_PRICES).map(([type, price]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => update('bus_pref', type)}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      form.bus_pref === type
                        ? 'border-burgundy-800 bg-burgundy-50 dark:bg-burgundy-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-semibold text-sm">{type}</p>
                    <p className="text-xs text-gray-400">from {price} TND/seat</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="label">Additional Notes</label>
              <textarea
                className="input h-24 resize-none"
                placeholder="Special requirements, accessibility needs, return trip..."
                value={form.notes}
                onChange={e => update('notes', e.target.value)}
              />
            </div>

            <button
              id="group-submit"
              type="submit"
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
              disabled={loading}
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Send size={16} /> Submit Group Request</>}
            </button>
          </form>
        </div>

        {/* Live price estimator */}
        <div>
          <div className="card sticky top-20">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Price Estimator</h3>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Route</span><span className="font-medium">{form.departure || '—'} → {form.destination || '—'}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Passengers</span><span className="font-medium">{form.people_count}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Bus type</span><span className="font-medium">{form.bus_pref}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Base rate</span><span className="font-medium">{BASE_PRICES[form.bus_pref]} TND/seat</span></div>
            </div>
            <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-500">Per person</span>
                <span className="text-xl font-bold text-burgundy-800 dark:text-burgundy-400">{perPerson} TND</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Estimated Total</span>
                <span className="text-2xl font-extrabold text-gray-900 dark:text-white">{estimatedTotal} TND</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">* Final price confirmed by our team within 24h</p>
            </div>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <p className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-1">✓ Group Benefits</p>
              <ul className="text-xs text-blue-600 dark:text-blue-300 space-y-1">
                <li>• Free cancellation 48h before</li>
                <li>• Dedicated bus & driver</li>
                <li>• Flexible pickup time</li>
                <li>• Group discount applied</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
