import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Bus, Eye, EyeOff, ArrowRight, Check } from 'lucide-react'
import toast from 'react-hot-toast'

const REQUIREMENTS = [
  { test: v => v.length >= 8, label: 'At least 8 characters' },
  { test: v => /[A-Z]/.test(v), label: 'One uppercase letter' },
  { test: v => /[0-9]/.test(v), label: 'One number' },
]

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', role: 'user' })
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      const user = await register(form.name, form.email, form.password, form.role)
      navigate(user.role === 'operator' ? '/operator' : '/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-130px)] flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-hero flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 text-center">
          <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-white/30">
            <Bus size={40} className="text-white" />
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">Join Us Today</h2>
          <p className="text-white/70 text-lg max-w-sm">
            Create your account and start booking bus trips across Beautiful Tunisia.
          </p>
          <div className="mt-8 space-y-3">
            {['Free cancellation on all bookings', 'Exclusive member discounts', 'Real-time trip notifications'].map(t => (
              <div key={t} className="flex items-center gap-3 text-white/80 text-sm">
                <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                  <Check size={12} className="text-yellow-300" />
                </div>
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-950">
        <div className="w-full max-w-md">
          <div className="card">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Create Account</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Join thousands of Tunisian travelers</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">I want to register as a</label>
                <div className="grid grid-cols-2 gap-2 bg-gray-100/80 dark:bg-gray-800/60 p-1.5 rounded-2xl border border-gray-200/20">
                  <button
                    type="button"
                    onClick={() => update('role', 'user')}
                    className={`py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${
                      form.role === 'user'
                        ? 'bg-burgundy-800 text-white shadow-md'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    Traveler (Client)
                  </button>
                  <button
                    type="button"
                    onClick={() => update('role', 'operator')}
                    className={`py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${
                      form.role === 'operator'
                        ? 'bg-burgundy-800 text-white shadow-md'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    Bus Operator
                  </button>
                </div>
              </div>

              <div>
                <label className="label" htmlFor="reg-name">Full Name</label>
                <input
                  id="reg-name"
                  type="text"
                  className="input"
                  placeholder="Ahmed Ben Ali"
                  value={form.name}
                  onChange={e => update('name', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="label" htmlFor="reg-email">Email address</label>
                <input
                  id="reg-email"
                  type="email"
                  className="input"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => update('email', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="label" htmlFor="reg-password">Password</label>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={show ? 'text' : 'password'}
                    className="input pr-10"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => update('password', e.target.value)}
                    required
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" onClick={() => setShow(s => !s)}>
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {form.password && (
                  <div className="mt-2 space-y-1">
                    {REQUIREMENTS.map(r => (
                      <div key={r.label} className={`flex items-center gap-2 text-xs ${r.test(form.password) ? 'text-green-600' : 'text-gray-400'}`}>
                        <Check size={11} className={r.test(form.password) ? 'text-green-500' : 'text-gray-300'} />
                        {r.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="label" htmlFor="reg-confirm">Confirm Password</label>
                <input
                  id="reg-confirm"
                  type="password"
                  className={`input ${form.confirm && form.confirm !== form.password ? 'border-red-400 focus:ring-red-400' : ''}`}
                  placeholder="••••••••"
                  value={form.confirm}
                  onChange={e => update('confirm', e.target.value)}
                  required
                />
              </div>

              <button
                id="reg-submit"
                type="submit"
                className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
                disabled={loading}
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Create Account <ArrowRight size={16} /></>}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-5">
              Already have an account?{' '}
              <Link to="/login" className="text-burgundy-800 dark:text-burgundy-400 font-semibold hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
