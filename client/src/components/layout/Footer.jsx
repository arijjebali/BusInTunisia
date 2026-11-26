import { Link } from 'react-router-dom'
import { Bus, Mail, Phone, MapPin, Facebook, Twitter, Instagram } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function Footer() {
  const { user } = useAuth()

  return (
    <footer className="bg-gray-900 dark:bg-gray-950 text-gray-300 pt-16 pb-8">
      <div className="container-page">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-burgundy-800 rounded-xl flex items-center justify-center">
                <Bus size={20} className="text-white" />
              </div>
              <span className="text-xl font-bold text-white">BusInTunisia</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">
              Your trusted partner for comfortable bus travel across Tunisia. Book your journey in seconds.
            </p>
            <div className="flex gap-3">
              {[Facebook, Twitter, Instagram].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 bg-gray-800 hover:bg-burgundy-800 rounded-lg flex items-center justify-center transition-colors duration-200">
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li key="/">
                <Link to="/" className="text-sm text-gray-400 hover:text-burgundy-400 transition-colors">Home</Link>
              </li>
              {(!user || user.role !== 'admin') && [
                { to: '/search', label: 'Find Trips' },
                { to: '/group-trip', label: 'Group Travel' },
                { to: '/dashboard', label: 'My Bookings' },
              ].map(l => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm text-gray-400 hover:text-burgundy-400 transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Popular Routes */}
          <div>
            <h3 className="text-white font-semibold mb-4">Popular Routes</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>Tunis → Sfax</li>
              <li>Tunis → Djerba</li>
              <li>Sfax → Gafsa</li>
              <li>Tunis → Sousse</li>
              <li>Sousse → Monastir</li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3">
              {[
                { Icon: MapPin, text: 'Avenue Habib Bourguiba, Tunis' },
                { Icon: Phone, text: '+216 71 000 000' },
                { Icon: Mail, text: 'support@busintunisia.tn' },
              ].map(({ Icon, text }, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-400">
                  <Icon size={15} className="text-burgundy-500 mt-0.5 flex-shrink-0" />
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} BusInTunisia. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-gray-300 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-gray-300 transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
