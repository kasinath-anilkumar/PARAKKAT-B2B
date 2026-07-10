import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as authApi from '../api/auth.api';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await authApi.login(email, password);

      if ('mfaSetupRequired' in result) {
        navigate('/mfa/setup', { state: { mfaPendingToken: result.mfaPendingToken } });
        return;
      }
      if ('mfaRequired' in result) {
        navigate('/mfa/verify', {
          state: { mfaPendingToken: result.mfaPendingToken, mfaMethod: result.mfaMethod },
        });
        return;
      }

      setSession(result.accessToken, result.user);
      navigate('/');
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
          'Login failed',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md"
      >
        <h1 className="mb-6 text-xl font-semibold text-slate-900">
          B2B Resort Booking Portal
        </h1>

        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />

        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-slate-900 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="mt-6 text-center text-sm text-slate-500">
          New partner agency?{' '}
          <Link to="/onboarding/register" className="text-slate-900 underline">
            Register
          </Link>{' '}
          or{' '}
          <Link to="/onboarding/resume" className="text-slate-900 underline">
            resume an application
          </Link>
          .
        </p>
      </form>
    </div>
  );
}
