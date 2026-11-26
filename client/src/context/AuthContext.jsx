import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      fetchMe()
    } else {
      setLoading(false)
    }
  }, [token])

  const fetchMe = async () => {
    try {
      const res = await axios.get('/api/auth/me')
      setUser(res.data.user)
    } catch {
      logout()
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    const res = await axios.post('/api/auth/login', { email, password })
    const { token: tok, user: u } = res.data
    localStorage.setItem('token', tok)
    axios.defaults.headers.common['Authorization'] = `Bearer ${tok}`
    setToken(tok)
    setUser(u)
    toast.success(`Welcome back, ${u.name}!`)
    return u
  }

  const register = async (name, email, password, role = 'user') => {
    const res = await axios.post('/api/auth/register', { name, email, password, role })
    const { token: tok, user: u } = res.data
    localStorage.setItem('token', tok)
    axios.defaults.headers.common['Authorization'] = `Bearer ${tok}`
    setToken(tok)
    setUser(u)
    toast.success(`Account created! Welcome, ${u.name}!`)
    return u
  }

  const logout = () => {
    localStorage.removeItem('token')
    delete axios.defaults.headers.common['Authorization']
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
