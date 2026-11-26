import { useState, useEffect } from 'react';
import { adminAPI } from '../api';
import { Users, Ticket, DollarSign, Bus, UserCheck, Shield, Map, Plus, Trash2, Check, X, Users as GroupIcon } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({ users: 0, bookings: 0, revenue: 0 });
  const [users, setUsers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [trips, setTrips] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [groups, setGroups] = useState([]);
  const [cities, setCities] = useState([]);
  const [buses, setBuses] = useState([]);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupPriceModal, setGroupPriceModal] = useState(null);
  const [groupPrice, setGroupPrice] = useState('');

  const [routeForm, setRouteForm] = useState({ departure_city_id: '', arrival_city_id: '', distance: 0, duration: '00:00:00' });
  const [tripForm, setTripForm] = useState({ route_id: '', bus_id: '', departure_time: '', arrival_time: '', price: 0 });
  const [busForm, setBusForm] = useState({ registration_number: '', capacity: 40, type: 'Standard', operator_id: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [st, us, rt, tr, ci, bu, bk, gr, op] = await Promise.all([
        adminAPI.getStats(), adminAPI.getUsers(), adminAPI.getRoutes(), 
        adminAPI.getTrips(), adminAPI.getCities(), adminAPI.getBuses(),
        adminAPI.getBookings(), adminAPI.getGroups(), adminAPI.getOperators()
      ]);
      setStats(st.data); setUsers(us.data.users); setRoutes(rt.data); 
      setTrips(tr.data); setCities(ci.data); setBuses(bu.data);
      setBookings(bk.data); setGroups(gr.data); setOperators(op.data.operators);
    } catch {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateRoute = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createRoute(routeForm);
      toast.success('Route created');
      setRouteForm({ departure_city_id: '', arrival_city_id: '', distance: 0, duration: '00:00:00' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create route');
    }
  };

  const handleDeleteRoute = async (id) => {
    if (!window.confirm('Delete this route?')) return;
    try {
      await adminAPI.deleteRoute(id);
      toast.success('Route deleted');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete route');
    }
  };

  const handleCreateTrip = async (e) => {
    e.preventDefault();
    // format datetime-local value to SQL datetime format (YYYY-MM-DD HH:MM:SS) if needed, 
    // but the backend accepts standard ISO anyway. We just pass it.
    try {
      await adminAPI.createTrip(tripForm);
      toast.success('Trip created');
      setTripForm({ route_id: '', bus_id: '', departure_time: '', arrival_time: '', price: 0 });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create trip');
    }
  };

  const handleDeleteTrip = async (id) => {
    if (!window.confirm('Delete this trip?')) return;
    try {
      await adminAPI.deleteTrip(id);
      toast.success('Trip deleted');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete trip');
    }
  };

  const handleConfirmBooking = async (id) => {
    try {
      await adminAPI.confirmBooking(id);
      toast.success('Booking confirmed!');
      fetchData();
    } catch { toast.error('Failed to confirm booking'); }
  };

  const handleRejectBooking = async (id) => {
    if (!window.confirm('Reject this booking?')) return;
    try {
      await adminAPI.rejectBooking(id);
      toast.success('Booking rejected');
      fetchData();
    } catch { toast.error('Failed to reject booking'); }
  };

  const handleConfirmGroup = async () => {
    try {
      await adminAPI.confirmGroup(groupPriceModal.id, groupPrice);
      toast.success('Group request accepted!');
      setGroupPriceModal(null); setGroupPrice('');
      fetchData();
    } catch { toast.error('Failed to confirm group'); }
  };

  const handleRejectGroup = async (id) => {
    if (!window.confirm('Reject this group request?')) return;
    try {
      await adminAPI.rejectGroup(id);
      toast.success('Group request rejected');
      fetchData();
    } catch { toast.error('Failed to reject group'); }
  };

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="container-page py-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Platform overview and management</p>
      </div>

      <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto pb-2">
        {['overview', 'bookings', 'groups', 'users', 'routes', 'trips', 'buses'].map(tab => {
          const pendingBookings = bookings.filter(b => b.status === 'pending').length;
          const pendingGroups = groups.filter(g => g.status === 'pending').length;
          const badge = tab === 'bookings' ? pendingBookings : tab === 'groups' ? pendingGroups : 0;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
                activeTab === tab 
                  ? 'bg-burgundy-800 text-white' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {badge > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card flex items-center p-6">
            <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-4">
              <Users className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Clients</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.users}</p>
            </div>
          </div>
          <div className="card flex items-center p-6">
            <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-4">
              <Ticket className="text-green-600 dark:text-green-400" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.bookings}</p>
            </div>
          </div>
          <div className="card flex items-center p-6">
            <div className="w-14 h-14 rounded-full bg-burgundy-100 dark:bg-burgundy-900/30 flex items-center justify-center mr-4">
              <DollarSign className="text-burgundy-800 dark:text-burgundy-400" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{Number(stats.revenue).toFixed(2)} TND</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bookings' && (
        <div className="card overflow-hidden">
          <h2 className="text-xl font-bold p-6 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <Ticket size={20}/> Booking Requests
            {bookings.filter(b=>b.status==='pending').length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs font-medium rounded-full">
                {bookings.filter(b=>b.status==='pending').length} pending
              </span>
            )}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 text-sm uppercase">
                  <th className="px-6 py-4">Passenger</th>
                  <th className="px-6 py-4">Route</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {bookings.map(b => (
                  <tr key={b.id}>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900 dark:text-white">{b.first_name} {b.last_name}</p>
                      <p className="text-xs text-gray-400">{b.email}</p>
                    </td>
                    <td className="px-6 py-4 font-medium">{b.departure} → {b.arrival}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{b.trip_date} {b.departure_time}</td>
                    <td className="px-6 py-4 font-bold text-burgundy-800">{Number(b.total_amount).toFixed(2)} TND</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        b.status === 'confirmed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                        b.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>{b.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      {b.status === 'pending' && (
                        <div className="flex gap-2">
                          <button onClick={() => handleConfirmBooking(b.id)} className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition-colors"><Check size={13}/> Confirm</button>
                          <button onClick={() => handleRejectBooking(b.id)} className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition-colors"><X size={13}/> Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'groups' && (
        <div className="card overflow-hidden">
          <h2 className="text-xl font-bold p-6 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <GroupIcon size={20}/> Group Travel Requests
            {groups.filter(g=>g.status==='pending').length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs font-medium rounded-full">
                {groups.filter(g=>g.status==='pending').length} pending
              </span>
            )}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 text-sm uppercase">
                  <th className="px-6 py-4">Passenger</th>
                  <th className="px-6 py-4">Route</th>
                  <th className="px-6 py-4">Date / People</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {groups.map(g => (
                  <tr key={g.id}>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900 dark:text-white">{g.first_name} {g.last_name}</p>
                      <p className="text-xs text-gray-400">{g.email}</p>
                    </td>
                    <td className="px-6 py-4 font-medium">{g.departure} → {g.destination}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{g.travel_date}<br/>{g.people_count} people</td>
                    <td className="px-6 py-4 text-sm capitalize">{g.trip_type}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        g.status === 'accepted' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                        g.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>{g.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      {g.status === 'pending' && (
                        <div className="flex gap-2">
                          <button onClick={() => { setGroupPriceModal(g); setGroupPrice(''); }} className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition-colors"><Check size={13}/> Accept</button>
                          <button onClick={() => handleRejectGroup(g.id)} className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition-colors"><X size={13}/> Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Group price modal */}
      {groupPriceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">Accept Group Request</h3>
            <p className="text-sm text-gray-500 mb-4">{groupPriceModal.departure} → {groupPriceModal.destination} · {groupPriceModal.people_count} people</p>
            <label className="label">Set Price (TND)</label>
            <input type="number" step="0.5" className="input mb-4" placeholder="e.g. 450" value={groupPrice} onChange={e => setGroupPrice(e.target.value)} />
            <div className="flex gap-3">
              <button className="btn-outline flex-1" onClick={() => setGroupPriceModal(null)}>Cancel</button>
              <button className="btn-primary flex-1" onClick={handleConfirmGroup}>Confirm</button>
            </div>
          </div>
        </div>
      )}\n
      {activeTab === 'users' && (
        <div className="card overflow-hidden">
          <h2 className="text-xl font-bold p-6 border-b border-gray-200 dark:border-gray-700">Registered Users</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 text-sm uppercase">
                  <th className="px-6 py-4">Name</th><th className="px-6 py-4">Email</th><th className="px-6 py-4">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {users.map(u => {
                  const isAdmin = u.role.includes('ADMIN');
                  const isOperator = u.role.includes('OPERATOR');
                  return (
                    <tr key={u.id}>
                      <td className="px-6 py-4 flex items-center gap-3 text-gray-900 dark:text-white font-medium">
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        {u.name}
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                          isAdmin 
                            ? 'bg-burgundy-100 text-burgundy-800 dark:bg-burgundy-900/30 dark:text-burgundy-400'
                            : isOperator
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                          {isAdmin && <Shield size={12} />}
                          {isOperator && <Bus size={12} />}
                          {(!isAdmin && !isOperator) && <UserCheck size={12} />}
                          {isAdmin ? 'Admin' : isOperator ? 'Operator' : 'Client'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'routes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <form onSubmit={handleCreateRoute} className="card p-6 sticky top-20">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Map size={20}/> Add Route</h2>
              <div className="space-y-4">
                <div>
                  <label className="label">Departure</label>
                  <select className="input" required value={routeForm.departure_city_id} onChange={e => setRouteForm({...routeForm, departure_city_id: e.target.value})}>
                    <option value="">Select City</option>{cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Arrival</label>
                  <select className="input" required value={routeForm.arrival_city_id} onChange={e => setRouteForm({...routeForm, arrival_city_id: e.target.value})}>
                    <option value="">Select City</option>{cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Distance (km)</label>
                  <input type="number" className="input" required value={routeForm.distance} onChange={e => setRouteForm({...routeForm, distance: e.target.value})} />
                </div>
                <div>
                  <label className="label">Duration (HH:MM)</label>
                  <input 
                    type="time" 
                    className="input" 
                    required 
                    value={routeForm.duration.substring(0, 5)} 
                    onChange={e => setRouteForm({...routeForm, duration: `${e.target.value}:00`})} 
                  />
                </div>
                <button type="submit" className="btn-primary w-full flex justify-center items-center gap-2"><Plus size={16}/> Create Route</button>
              </div>
            </form>
          </div>
          <div className="lg:col-span-2">
            <div className="card">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 text-sm uppercase">
                    <th className="px-6 py-4">Route</th><th className="px-6 py-4">Distance</th><th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {routes.map(r => (
                    <tr key={r.id}>
                      <td className="px-6 py-4 font-bold">{r.departure_city} → {r.arrival_city}</td>
                      <td className="px-6 py-4">{r.distance} km</td>
                      <td className="px-6 py-4">
                        <button onClick={() => handleDeleteRoute(r.id)} className="text-red-500 hover:text-red-700"><Trash2 size={18}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'trips' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <form onSubmit={handleCreateTrip} className="card p-6 sticky top-20">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Bus size={20}/> Add Trip</h2>
              <div className="space-y-4">
                <div>
                  <label className="label">Route</label>
                  <select className="input" required value={tripForm.route_id} onChange={e => setTripForm({...tripForm, route_id: e.target.value})}>
                    <option value="">Select Route</option>{routes.map(r => <option key={r.id} value={r.id}>{r.departure_city} → {r.arrival_city}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Bus</label>
                  <select className="input" required value={tripForm.bus_id} onChange={e => setTripForm({...tripForm, bus_id: e.target.value})}>
                    <option value="">Select Bus</option>{buses.map(b => <option key={b.id} value={b.id}>{b.registration_number}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Departure Time</label>
                  <div className="flex gap-2">
                    <input 
                      type="date" 
                      className="input flex-1" 
                      required 
                      value={tripForm.departure_time.split('T')[0] || ''} 
                      onChange={e => setTripForm({...tripForm, departure_time: `${e.target.value}T${tripForm.departure_time.split('T')[1] || '00:00'}`})} 
                    />
                    <select 
                      className="input w-20 px-2" 
                      value={(tripForm.departure_time.split('T')[1] || '00:00').split(':')[0]}
                      onChange={e => setTripForm({...tripForm, departure_time: `${tripForm.departure_time.split('T')[0] || new Date().toISOString().split('T')[0]}T${e.target.value}:${(tripForm.departure_time.split('T')[1] || '00:00').split(':')[1]}`})}
                    >
                      {Array.from({length: 24}).map((_, i) => <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}h</option>)}
                    </select>
                    <select 
                      className="input w-20 px-2" 
                      value={(tripForm.departure_time.split('T')[1] || '00:00').split(':')[1]}
                      onChange={e => setTripForm({...tripForm, departure_time: `${tripForm.departure_time.split('T')[0] || new Date().toISOString().split('T')[0]}T${(tripForm.departure_time.split('T')[1] || '00:00').split(':')[0]}:${e.target.value}`})}
                    >
                      {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => <option key={m} value={String(m).padStart(2, '0')}>{String(m).padStart(2, '0')}m</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Arrival Time</label>
                  <div className="flex gap-2">
                    <input 
                      type="date" 
                      className="input flex-1" 
                      required 
                      value={tripForm.arrival_time.split('T')[0] || ''} 
                      onChange={e => setTripForm({...tripForm, arrival_time: `${e.target.value}T${tripForm.arrival_time.split('T')[1] || '00:00'}`})} 
                    />
                    <select 
                      className="input w-20 px-2" 
                      value={(tripForm.arrival_time.split('T')[1] || '00:00').split(':')[0]}
                      onChange={e => setTripForm({...tripForm, arrival_time: `${tripForm.arrival_time.split('T')[0] || new Date().toISOString().split('T')[0]}T${e.target.value}:${(tripForm.arrival_time.split('T')[1] || '00:00').split(':')[1]}`})}
                    >
                      {Array.from({length: 24}).map((_, i) => <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}h</option>)}
                    </select>
                    <select 
                      className="input w-20 px-2" 
                      value={(tripForm.arrival_time.split('T')[1] || '00:00').split(':')[1]}
                      onChange={e => setTripForm({...tripForm, arrival_time: `${tripForm.arrival_time.split('T')[0] || new Date().toISOString().split('T')[0]}T${(tripForm.arrival_time.split('T')[1] || '00:00').split(':')[0]}:${e.target.value}`})}
                    >
                      {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => <option key={m} value={String(m).padStart(2, '0')}>{String(m).padStart(2, '0')}m</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Price (TND)</label>
                  <input type="number" step="0.1" className="input" required value={tripForm.price} onChange={e => setTripForm({...tripForm, price: e.target.value})} />
                </div>
                <button type="submit" className="btn-primary w-full flex justify-center items-center gap-2"><Plus size={16}/> Create Trip</button>
              </div>
            </form>
          </div>
          <div className="lg:col-span-2">
            <div className="card overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 text-sm uppercase">
                    <th className="px-6 py-4">Route</th><th className="px-6 py-4">Time</th><th className="px-6 py-4">Bus / Price</th><th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {trips.map(t => {
                    const dep = new Date(t.departure_time);
                    const arr = new Date(t.arrival_time);
                    const dateOpts = { day: 'numeric', month: 'short', year: 'numeric' };
                    const timeOpts = { hour: '2-digit', minute: '2-digit' };
                    return (
                      <tr key={t.id}>
                        <td className="px-6 py-4 font-bold">{t.departure} → {t.arrival}</td>
                        <td className="px-6 py-4 text-sm">
                          <div className="font-medium text-gray-900 dark:text-white mb-1">
                            {dep.toLocaleDateString('en-GB', dateOpts)}
                          </div>
                          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md inline-flex">
                            {dep.toLocaleTimeString('en-GB', timeOpts)} <span className="text-xs">→</span> {arr.toLocaleTimeString('en-GB', timeOpts)}
                          </div>
                        </td>
                        <td className="px-6 py-4">{t.bus_reg}<br/><span className="text-burgundy-800 font-bold">{t.price} TND</span></td>
                        <td className="px-6 py-4">
                          <button onClick={() => handleDeleteTrip(t.id)} className="text-red-500 hover:text-red-700"><Trash2 size={18}/></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'buses' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                if (busForm.id) {
                  await adminAPI.updateBus(busForm.id, busForm);
                  toast.success('Bus updated');
                } else {
                  await adminAPI.createBus(busForm);
                  toast.success('Bus created');
                }
                setBusForm({ registration_number: '', capacity: 40, type: 'Standard', operator_id: '' });
                fetchData();
              } catch (err) {
                toast.error(err.response?.data?.message || 'Failed to save bus');
              }
            }} className="card p-6 sticky top-20">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Bus size={20}/> {busForm.id ? 'Edit Bus' : 'Add Bus'}</h2>
              <div className="space-y-4">
                <div>
                  <label className="label">Registration Number</label>
                  <input type="text" className="input" required placeholder="e.g. 123 TUN 4567" value={busForm.registration_number} onChange={e => setBusForm({...busForm, registration_number: e.target.value})} />
                </div>
                <div>
                  <label className="label">Capacity</label>
                  <input type="number" className="input" required value={busForm.capacity} onChange={e => setBusForm({...busForm, capacity: parseInt(e.target.value)})} />
                </div>
                <div>
                  <label className="label">Type</label>
                  <select className="input" required value={busForm.type} onChange={e => setBusForm({...busForm, type: e.target.value})}>
                    <option value="Standard">Standard</option>
                    <option value="Comfort">Comfort</option>
                    <option value="VIP">VIP</option>
                  </select>
                </div>
                <div>
                  <label className="label">Assign Operator</label>
                  <select className="input" required value={busForm.operator_id} onChange={e => setBusForm({...busForm, operator_id: e.target.value})}>
                    <option value="" disabled>Select an operator</option>
                    {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary flex-1 flex justify-center items-center gap-2"><Check size={16}/> Save</button>
                  {busForm.id && <button type="button" onClick={() => setBusForm({ registration_number: '', capacity: 40, type: 'Standard', operator_id: '' })} className="btn-outline">Cancel</button>}
                </div>
              </div>
            </form>
          </div>
          <div className="lg:col-span-2">
            <div className="card overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 text-sm uppercase">
                    <th className="px-6 py-4">Matricule</th><th className="px-6 py-4">Details</th><th className="px-6 py-4">Operator</th><th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {buses.map(b => (
                    <tr key={b.id}>
                      <td className="px-6 py-4 font-bold">{b.registration_number}</td>
                      <td className="px-6 py-4 text-sm">{b.capacity} seats<br/><span className="text-gray-500">{b.type}</span></td>
                      <td className="px-6 py-4">{b.operator_name}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button onClick={() => setBusForm({ id: b.id, registration_number: b.registration_number, capacity: b.capacity, type: b.type, operator_id: b.operator_id || '' })} className="text-blue-500 hover:text-blue-700">Edit</button>
                          <button onClick={async () => {
                            if (!window.confirm('Delete this bus?')) return;
                            try {
                              await adminAPI.deleteBus(b.id);
                              toast.success('Bus deleted');
                              fetchData();
                            } catch (err) {
                              toast.error(err.response?.data?.message || 'Failed to delete bus');
                            }
                          }} className="text-red-500 hover:text-red-700"><Trash2 size={18}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
