import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MapPin, Calendar, Users, Search, ArrowRight,
  Clock, Shield, Star, ChevronRight, Zap
} from 'lucide-react'

const CITIES = [
  'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Djerba', 'Douz', 'Gabès', 'Gafsa',
  'Hammamet', 'Jendouba', 'Kairouan', 'Kasserine', 'Kebili', 'Le Kef', 'Mahdia',
  'Manouba', 'Medenine', 'Monastir', 'Nabeul', 'Sfax', 'Sidi Bouzid', 'Siliana',
  'Sousse', 'Tabarka', 'Tataouine', 'Tozeur', 'Tunis', 'Zaghouan', 'Zarzis'
]

const POPULAR_ROUTES = [
  { from: 'Tunis', to: 'Sfax', duration: '3h 30m', price: 25, trips: 12 },
  { from: 'Tunis', to: 'Djerba', duration: '6h', price: 45, trips: 8 },
  { from: 'Tunis', to: 'Sousse', duration: '2h', price: 15, trips: 18 },
  { from: 'Sfax', to: 'Gafsa', duration: '2h', price: 18, trips: 6 },
  { from: 'Tunis', to: 'Bizerte', duration: '1h 30m', price: 10, trips: 14 },
  { from: 'Sousse', to: 'Monastir', duration: '30m', price: 5, trips: 20 },
]

const FEATURES = [
  { icon: Zap, title: 'Instant Booking', desc: 'Book your ticket in under 60 seconds' },
  { icon: Shield, title: 'Secure Payment', desc: 'Your transactions are always protected' },
  { icon: Star, title: 'Top Rated', desc: 'Rated 4.8/5 by thousands of travelers' },
  { icon: Clock, title: '24/7 Support', desc: 'We\'re here whenever you need us' },
]

export default function Home() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    departure: '', destination: '', date: new Date().toISOString().split('T')[0], passengers: 1
  })

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSearch = (e) => {
    e.preventDefault()
    if (!form.departure || !form.destination) return
    navigate(`/search?departure=${form.departure}&destination=${form.destination}&date=${form.date}&passengers=${form.passengers}`)
  }

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>

        <div className="container-page relative z-10 py-20 md:py-28">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-full mb-6 border border-white/20">
              <Zap size={14} className="text-yellow-300" />
              Tunisia&apos;s #1 Bus Booking Platform
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4 leading-tight">
              Travel Smarter<br />
              <span className="text-yellow-300">Across Tunisia</span>
            </h1>
            <p className="text-lg text-white/80 max-w-xl mx-auto">
              Book bus tickets from Tunis to Sfax, Djerba, Sousse and more — fast and secure.
            </p>
          </div>

          {/* Search Form */}
          <form
            onSubmit={handleSearch}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-3xl mx-auto"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="label">From</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    id="home-departure"
                    className="input pl-9"
                    value={form.departure}
                    onChange={e => update('departure', e.target.value)}
                    required
                  >
                    <option value="">Departure</option>
                    {CITIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">To</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-burgundy-600" />
                  <select
                    id="home-destination"
                    className="input pl-9"
                    value={form.destination}
                    onChange={e => update('destination', e.target.value)}
                    required
                  >
                    <option value="">Destination</option>
                    {CITIES.filter(c => c !== form.departure).map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Date</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="home-date"
                    type="date"
                    className="input pl-9"
                    value={form.date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => update('date', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="label">Passengers</label>
                <div className="relative">
                  <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="home-passengers"
                    type="number"
                    className="input pl-9"
                    value={form.passengers}
                    min={1}
                    max={9}
                    onChange={e => update('passengers', Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              id="home-search-btn"
              className="btn-primary w-full mt-4 flex items-center justify-center gap-2 text-base py-3"
            >
              <Search size={18} />
              Search Trips
            </button>
          </form>
        </div>
      </section>

      {/* Features */}
      <section className="section bg-white dark:bg-gray-900">
        <div className="container-page">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center p-6 rounded-2xl bg-gray-50 dark:bg-gray-800 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-burgundy-100 dark:bg-burgundy-900/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Icon size={22} className="text-burgundy-800 dark:text-burgundy-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Routes */}
      <section className="section bg-gray-50 dark:bg-gray-950">
        <div className="container-page">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-burgundy-800 dark:text-burgundy-400 font-semibold text-sm uppercase tracking-wider mb-2">Most Booked</p>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Popular Routes</h2>
            </div>
            <button
              onClick={() => navigate('/search')}
              className="btn-ghost flex items-center gap-1 text-sm hidden sm:flex"
            >
              View all <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {POPULAR_ROUTES.map((r) => (
              <button
                key={`${r.from}-${r.to}`}
                onClick={() => navigate(`/search?departure=${r.from}&destination=${r.to}&date=${form.date}&passengers=1`)}
                className="card text-left hover:border hover:border-burgundy-200 dark:hover:border-burgundy-800 group cursor-pointer transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900 dark:text-white">{r.from}</span>
                    <ArrowRight size={16} className="text-burgundy-600" />
                    <span className="font-semibold text-gray-900 dark:text-white">{r.to}</span>
                  </div>
                  <span className="badge badge-neutral">{r.trips} daily</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock size={13} />
                    {r.duration}
                  </div>
                  <div className="text-xl font-bold text-burgundy-800 dark:text-burgundy-400">
                    {r.price} <span className="text-sm font-medium">TND</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-gradient-hero py-16">
        <div className="container-page text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Traveling with a group?
          </h2>
          <p className="text-white/80 mb-8 max-w-lg mx-auto">
            Book for friends, family, or school trips with our dedicated group travel service and get exclusive rates.
          </p>
          <button
            onClick={() => navigate('/group-trip')}
            className="bg-white text-burgundy-800 hover:bg-gray-100 font-bold py-3 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Request a Group Trip
          </button>
        </div>
      </section>
    </div>
  )
}
