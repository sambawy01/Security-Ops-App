import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, IdCard, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [badgeNumber, setBadgeNumber] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // If already authenticated, redirect immediately
  if (isAuthenticated) {
    navigate('/', { replace: true });
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(badgeNumber, pin);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 to-slate-900 px-4">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-2xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-900 mb-4">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Security OS
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            El Gouna Security Operations
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Badge Number */}
          <div>
            <label
              htmlFor="badgeNumber"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Badge Number
            </label>
            <div className="relative">
              <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                id="badgeNumber"
                type="text"
                value={badgeNumber}
                onChange={(e) => setBadgeNumber(e.target.value)}
                placeholder="e.g. MGR-001"
                required
                autoComplete="username"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-md text-sm
                           placeholder:text-slate-400 focus:outline-none focus:ring-2
                           focus:ring-slate-900 focus:border-transparent"
              />
            </div>
          </div>

          {/* PIN */}
          <div>
            <label
              htmlFor="pin"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              PIN
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                id="pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value.slice(0, 8))}
                placeholder="Enter PIN"
                required
                maxLength={8}
                autoComplete="current-password"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-md text-sm
                           placeholder:text-slate-400 focus:outline-none focus:ring-2
                           focus:ring-slate-900 focus:border-transparent"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md
                       bg-slate-900 text-white text-sm font-medium
                       hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2
                       focus:ring-slate-900 disabled:opacity-60 disabled:cursor-not-allowed
                       transition-colors"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </button>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 text-center" role="alert">
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
