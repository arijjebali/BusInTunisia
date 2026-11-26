import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import {
  Bus, Sun, Moon, Menu, X, User, LogOut,
  LayoutDashboard, Users, ChevronDown
} from 'lucide-react'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropOpen, setDropOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
    setDropOpen(false)
  }

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/search', label: 'Find Trips' },
    { to: '/group-trip', label: 'Group Travel' },
  ]

  return (
    <nav className="sticky top-0 z-50 glass border-b border-white/20 dark:border-gray-800">
      <div className="container-page">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 bg-burgundy-800 rounded-xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <Bus size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-gradient hidden sm:block">BusInTunisia</span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-1">
            {(!user || user.role !== 'admin') && navLinks.map(l => (
              <Link
                key={l.to}
                to={l.to}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200
                  ${location.pathname === l.to
                    ? 'bg-burgundy-800 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-burgundy-800 dark:hover:text-burgundy-400 hover:bg-burgundy-50 dark:hover:bg-burgundy-900/20'
                  }`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Right section */}
          <div className="flex items-center gap-2">
            {/* Dark mode toggle */}
            <button
              onClick={toggle}
              className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle dark mode"
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {user ? (
              <div className="relative" id="user-menu">
                <button
                  onClick={() => setDropOpen(d => !d)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-burgundy-800 flex items-center justify-center text-white text-sm font-bold">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[100px] truncate">
                    {user.name}
                  </span>
                  <ChevronDown size={14} className={`text-gray-400 transition-transform ${dropOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 animate-fade-in">
                    {user.role === 'admin' ? (
                      <Link
                        to="/admin"
                        onClick={() => setDropOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-burgundy-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <LayoutDashboard size={16} className="text-burgundy-800" />
                        Admin Dashboard
                      </Link>
                    ) : user.role === 'operator' ? (
                      <Link
                        to="/operator"
                        onClick={() => setDropOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-burgundy-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <LayoutDashboard size={16} className="text-burgundy-800" />
                        Operator Dashboard
                      </Link>
                    ) : (
                      <Link
                        to="/dashboard"
                        onClick={() => setDropOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-burgundy-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <User size={16} className="text-burgundy-800" />
                        My Dashboard
                      </Link>
                    )}
                    <hr className="my-1 border-gray-100 dark:border-gray-700" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/login" className="btn-ghost text-sm">Sign In</Link>
                <Link to="/register" className="btn-primary text-sm py-2 px-4">Get Started</Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMenuOpen(m => !m)}
              className="md:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100 dark:border-gray-800 animate-fade-in">
            <div className="flex flex-col gap-1">
              {(!user || user.role !== 'admin') && navLinks.map(l => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setMenuOpen(false)}
                  className="px-4 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-burgundy-50 dark:hover:bg-gray-800 font-medium"
                >
                  {l.label}
                </Link>
              ))}
              {!user && (
                <>
                  <Link to="/login" onClick={() => setMenuOpen(false)} className="px-4 py-3 text-burgundy-800 font-medium">
                    Sign In
                  </Link>
                  <Link to="/register" onClick={() => setMenuOpen(false)} className="btn-primary mt-2 text-center text-sm">
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
