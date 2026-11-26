import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/login'
  }
  return Promise.reject(err)
})

// Auth
export const authAPI = {
  register: d => api.post('/auth/register', d),
  login: d => api.post('/auth/login', d),
  me: () => api.get('/auth/me'),
}

// Trips
export const tripsAPI = {
  search: params => api.get('/trips/search', { params }),
  getById: id => api.get(`/trips/${id}`),
  getAll: () => api.get('/trips'),
  create: d => api.post('/trips', d),
  update: (id, d) => api.put(`/trips/${id}`, d),
  delete: id => api.delete(`/trips/${id}`),
}

// Bookings
export const bookingsAPI = {
  create: d => api.post('/bookings', d),
  getMy: () => api.get('/bookings/my'),
  getAll: () => api.get('/bookings'),
  cancel: id => api.put(`/bookings/${id}/cancel`),
}

// Tickets
export const ticketsAPI = {
  getByReservation: resId => api.get(`/tickets/${resId}`),
}

// Reviews
export const reviewsAPI = {
  submit: d => api.post('/reviews', d),
  getByTrip: tripId => api.get(`/reviews/trip/${tripId}`),
}

// Groups
export const groupsAPI = {
  submit: d => api.post('/groups', d),
  getMy: () => api.get('/groups/my'),
  getAll: () => api.get('/groups'),
  update: (id, d) => api.put(`/groups/${id}`, d),
}

// Admin
export const adminAPI = {
  getBuses: () => api.get('/admin/buses'),
  createBus: d => api.post('/admin/buses', d),
  updateBus: (id, d) => api.put(`/admin/buses/${id}`, d),
  deleteBus: id => api.delete(`/admin/buses/${id}`),
  getUsers: () => api.get('/admin/users'),
  getOperators: () => api.get('/admin/operators'),
  deleteUser: id => api.delete(`/admin/users/${id}`),
  getStats: () => api.get('/admin/stats'),
  getCities: () => api.get('/admin/cities'),
  getRoutes: () => api.get('/admin/routes'),
  createRoute: d => api.post('/admin/routes', d),
  updateRoute: (id, d) => api.put(`/admin/routes/${id}`, d),
  deleteRoute: id => api.delete(`/admin/routes/${id}`),
  getTrips: () => api.get('/admin/trips'),
  createTrip: d => api.post('/admin/trips', d),
  updateTrip: (id, d) => api.put(`/admin/trips/${id}`, d),
  deleteTrip: id => api.delete(`/admin/trips/${id}`),
  getBookings: () => api.get('/admin/bookings'),
  confirmBooking: id => api.put(`/admin/bookings/${id}/confirm`),
  rejectBooking: id => api.put(`/admin/bookings/${id}/reject`),
  getGroups: () => api.get('/admin/groups'),
  confirmGroup: (id, price) => api.put(`/admin/groups/${id}/confirm`, { price }),
  rejectGroup: id => api.put(`/admin/groups/${id}/reject`),
}

// Operator
export const operatorAPI = {
  getTrips: () => api.get('/operator/trips'),
}

export default api
