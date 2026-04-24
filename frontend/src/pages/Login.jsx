import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { LogIn, Zap } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    const demoEmail = 'admin@archdesign.com';
    const demoPassword = 'password123';
    setEmail(demoEmail);
    setPassword(demoPassword);
    setDemoLoading(true);
    try {
      await login(demoEmail, demoPassword);
      toast.success('Welcome to the demo!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Demo login failed');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="blueprint-bg flex min-h-screen items-center justify-center px-4">
      {/* Decorative gradient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl" />
      </div>

      <div className="glass w-full max-w-md p-8 animate-slide-up relative z-10">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mb-4 text-5xl">🏛️</div>
          <h1 className="gradient-text text-2xl font-bold">
            AI Architectural Design Generator
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Intelligent design tools for modern architecture
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="form-input"
            />
          </div>
          <div>
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
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
                <LogIn size={18} />
                Sign In
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-700" />
          <span className="text-xs text-slate-500">OR</span>
          <div className="h-px flex-1 bg-slate-700" />
        </div>

        {/* Demo Login */}
        <button
          onClick={handleDemo}
          disabled={demoLoading}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2.5 font-medium text-slate-200 hover:bg-slate-700 hover:border-slate-500 disabled:opacity-60"
        >
          {demoLoading ? (
            <span className="spinner" />
          ) : (
            <>
              <Zap size={18} className="text-yellow-400" />
              Demo Login
            </>
          )}
        </button>

        <p className="mt-4 text-center text-xs text-slate-500">
          Demo: admin@archdesign.com / password123
        </p>
      </div>
    </div>
  );
}
