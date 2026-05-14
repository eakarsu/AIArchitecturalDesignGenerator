import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { UserPlus } from 'lucide-react';
import api from '../services/api';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const data = await api
        .post('/auth/register', { name, email, password })
        .then((r) => r.data);

      // Store token the same way login does
      const token = data.token || data.data?.token;
      if (token) localStorage.setItem('token', token);

      // Re-use auth context login to set user state
      await login(email, password);
      toast.success('Account created! Welcome aboard.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Registration failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="blueprint-bg flex min-h-screen items-center justify-center px-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl" />
      </div>

      <div className="glass w-full max-w-md p-8 animate-slide-up relative z-10">
        <div className="mb-8 text-center">
          <div className="mb-4 text-5xl">🏛️</div>
          <h1 className="gradient-text text-2xl font-bold">Create Your Account</h1>
          <p className="mt-2 text-sm text-slate-400">
            Join the AI Architectural Design Generator
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Architect"
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat password"
              required
              className="form-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2.5 font-medium text-white shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-blue-400 disabled:opacity-60"
          >
            {loading ? (
              <span className="spinner" />
            ) : (
              <>
                <UserPlus size={18} />
                Create Account
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-400 hover:text-blue-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
